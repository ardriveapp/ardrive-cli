import { CLICommand, ParametersHelper } from '../CLICommand';
import {
	BoostParameter,
	ConflictResolutionParams,
	DestinationFileNameParameter,
	DrivePrivacyParameters,
	DryRunParameter,
	ShouldBundleParameter,
	LocalPathsParameter,
	LocalFilePathParameter_DEPRECATED,
	LocalFilesParameter_DEPRECATED,
	ParentFolderIdParameter,
	WalletFileParameter,
	LocalPathParameter,
	LocalCSVParameter,
	GatewayParameter
} from '../parameter_declarations';
import { fileUploadConflictPrompts, folderUploadConflictPrompts } from '../prompts';
import { ERROR_EXIT_CODE, SUCCESS_EXIT_CODE } from '../CLICommand/error_codes';
import { CLIAction } from '../CLICommand/action';
import {
	FolderID,
	ArFSFileToUpload,
	ArFSFolderToUpload,
	ArFSResult,
	DriveKey,
	wrapFileOrFolder,
	EID,
	readJWKFile,
	isFolder
} from 'ardrive-core-js';
import { cliArDriveFactory } from '..';
import * as fs from 'fs';
import { getArweaveFromURL } from '../utils/get_arweave_for_url';

interface UploadPathParameter {
	parentFolderId: FolderID;
	wrappedEntity: ArFSFileToUpload | ArFSFolderToUpload;
	destinationFileName?: string;
	drivePassword?: string;
	driveKey?: DriveKey;
}

type FilePath = string;

function getFilesFromCSV(parameters: ParametersHelper): UploadPathParameter[] | undefined {
	const localCSVFile =
		parameters.getParameterValue(LocalFilesParameter_DEPRECATED) ?? parameters.getParameterValue(LocalCSVParameter);
	if (!localCSVFile) {
		return undefined;
	}

	const localCSVFileData = fs.readFileSync(localCSVFile).toString().trim();
	const COLUMN_SEPARATOR = ',';
	const ROW_SEPARATOR = '\n';
	const csvRows = localCSVFileData.split(ROW_SEPARATOR);
	const fileParameters: UploadPathParameter[] = csvRows.map((row: string) => {
		const csvFields = row.split(COLUMN_SEPARATOR).map((f: string) => f.trim());
		const [localFilePath, destinationFileName, _parentFolderId, drivePassword, _driveKey] = csvFields;

		// TODO: Make CSV uploads more bulk performant
		const wrappedEntity = wrapFileOrFolder(localFilePath);
		const parentFolderId = EID(
			_parentFolderId ? _parentFolderId : parameters.getRequiredParameterValue(ParentFolderIdParameter)
		);
		const driveKey = _driveKey ? Buffer.from(_driveKey) : undefined;

		return {
			parentFolderId,
			wrappedEntity,
			destinationFileName,
			drivePassword: drivePassword ? drivePassword : undefined,
			driveKey
		};
	});

	return fileParameters;
}

function getFileList(parameters: ParametersHelper, parentFolderId: FolderID): UploadPathParameter[] | undefined {
	const localPaths = parameters.getParameterValue<string[]>(LocalPathsParameter);
	if (!localPaths) {
		return undefined;
	}

	const localPathsToUpload = localPaths.map((filePath: FilePath) => {
		const wrappedEntity = wrapFileOrFolder(filePath);

		return {
			parentFolderId,
			wrappedEntity
		};
	});

	return localPathsToUpload;
}

function getSingleFile(parameters: ParametersHelper, parentFolderId: FolderID): UploadPathParameter[] {
	// NOTE: Single file is the last possible use case. Throw exception if the parameter isn't found.
	const localFilePath =
		parameters.getParameterValue(LocalFilePathParameter_DEPRECATED, wrapFileOrFolder) ??
		parameters.getRequiredParameterValue(LocalPathParameter, wrapFileOrFolder);
	const singleParameter = {
		parentFolderId: parentFolderId,
		wrappedEntity: localFilePath,
		destinationFileName: parameters.getParameterValue(DestinationFileNameParameter)
	};

	return [singleParameter];
}

export const formatResults = (results: ArFSResult[]): ArFSResult =>
	results.reduce(
		(previousValue, currentValue) => ({
			created: [...previousValue.created, ...currentValue.created],
			tips: [...previousValue.tips, ...currentValue.tips],
			fees: { ...previousValue.fees, ...currentValue.fees }
		}),
		{ created: [], tips: [], fees: {} }
	);

new CLICommand({
	name: 'upload-file',
	parameters: [
		DryRunParameter,
		LocalPathParameter,
		LocalPathsParameter,
		LocalCSVParameter,
		ParentFolderIdParameter,
		DestinationFileNameParameter,
		BoostParameter,
		DryRunParameter,
		ShouldBundleParameter,
		...ConflictResolutionParams,
		...DrivePrivacyParameters,
		LocalFilePathParameter_DEPRECATED,
		LocalFilesParameter_DEPRECATED,
		BoostParameter,
		GatewayParameter
	],
	action: new CLIAction(async function action(options) {
		const parameters = new ParametersHelper(options);

		const filesToUpload: UploadPathParameter[] = await (async function (): Promise<UploadPathParameter[]> {
			// Try to get the list of files to upload and their destinations, etc. from a CSV
			const filesFromCSV = getFilesFromCSV(parameters);
			if (filesFromCSV) {
				return filesFromCSV;
			}

			// Determine list of files to upload and destinations from parameter list
			// First check the multi-file input case
			const parentFolderId: FolderID = parameters.getRequiredParameterValue(ParentFolderIdParameter, EID);
			const fileList = getFileList(parameters, parentFolderId);
			if (fileList) {
				return fileList;
			}

			// If neither the multi-file input case or csv case produced files, try the single file case (deprecated)
			return getSingleFile(parameters, parentFolderId);
		})();
		if (filesToUpload.length) {
			const wallet = parameters.getRequiredParameterValue(WalletFileParameter, readJWKFile);

			const conflictResolution = parameters.getFileNameConflictResolution();
			const shouldBundle = !!parameters.getParameterValue(ShouldBundleParameter);

			const arweave = getArweaveFromURL(parameters.getGateway());

			const arDrive = cliArDriveFactory({
				wallet: wallet,
				feeMultiple: parameters.getOptionalBoostSetting(),
				dryRun: parameters.isDryRun(),
				shouldBundle,
				arweave
			});

			const results = await Promise.all(
				filesToUpload.map(async (fileToUpload) => {
					const {
						parentFolderId,
						wrappedEntity,
						destinationFileName,
						drivePassword,
						driveKey: fileDriveKey
					} = fileToUpload;

					return await (async () => {
						if (await parameters.getIsPrivate()) {
							const driveId = await arDrive.getDriveIdForFolderId(parentFolderId);
							const driveKey =
								fileDriveKey ??
								(await parameters.getDriveKey({ driveId, drivePassword, useCache: true }));

							if (isFolder(wrappedEntity)) {
								return arDrive.createPrivateFolderAndUploadChildren({
									parentFolderId,
									wrappedFolder: wrappedEntity,
									driveKey,
									destParentFolderName: destinationFileName,
									conflictResolution,
									prompts: folderUploadConflictPrompts
								});
							} else {
								return arDrive.uploadPrivateFile({
									parentFolderId,
									wrappedFile: wrappedEntity,
									driveKey,
									destinationFileName,
									conflictResolution,
									prompts: fileUploadConflictPrompts
								});
							}
						} else {
							if (isFolder(wrappedEntity)) {
								return arDrive.createPublicFolderAndUploadChildren({
									parentFolderId,
									wrappedFolder: wrappedEntity,
									destParentFolderName: destinationFileName,
									conflictResolution,
									prompts: folderUploadConflictPrompts
								});
							} else {
								return arDrive.uploadPublicFile({
									parentFolderId,
									wrappedFile: wrappedEntity,
									destinationFileName,
									conflictResolution,
									prompts: fileUploadConflictPrompts
								});
							}
						}
					})();
				})
			);

			console.log(JSON.stringify(formatResults(results), null, 4));
			return SUCCESS_EXIT_CODE;
		}

		console.log(`No files to upload`);
		return ERROR_EXIT_CODE;
	})
});
