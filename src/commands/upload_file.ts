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
	CustomContentTypeParameter
} from '../parameter_declarations';
import { folderUploadConflictPrompts } from '../prompts';
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
	ArDriveUploadStats
} from 'ardrive-core-js';
import { cliArDriveFactory } from '..';
import * as fs from 'fs';

interface UploadPathParameter {
	parentFolderId: FolderID;
	wrappedEntity: ArFSFileToUpload | ArFSFolderToUpload;
	destinationFileName?: string;
	drivePassword?: string;
	driveKey?: DriveKey;
	customContentType?: string;
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
		// eslint-disable-next-line prettier/prettier
		const [localFilePath, destinationFileName, _parentFolderId, drivePassword, _driveKey, _customContentType] =
			// eslint-disable-next-line prettier/prettier
			csvFields;

		// TODO: Make CSV uploads more bulk performant
		const wrappedEntity = wrapFileOrFolder(localFilePath);
		const parentFolderId = EID(
			_parentFolderId ? _parentFolderId : parameters.getRequiredParameterValue(ParentFolderIdParameter)
		);
		const driveKey = _driveKey ? Buffer.from(_driveKey) : undefined;

		const customContentType = _customContentType ?? parameters.getParameterValue(CustomContentTypeParameter);

		return {
			parentFolderId,
			wrappedEntity,
			destinationFileName,
			drivePassword: drivePassword ? drivePassword : undefined,
			driveKey,
			customContentType
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
		CustomContentTypeParameter,
		LocalFilePathParameter_DEPRECATED,
		LocalFilesParameter_DEPRECATED
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

			const arDrive = cliArDriveFactory({
				wallet: wallet,
				feeMultiple: parameters.getOptionalBoostSetting(),
				dryRun: !!options.dryRun,
				shouldBundle
			});

			const uploadStats: ArDriveUploadStats[] = await Promise.all(
				filesToUpload.map(
					async ({
						parentFolderId,
						wrappedEntity,
						destinationFileName,
						driveKey,
						drivePassword,
						customContentType
					}) => {
						driveKey ??= (await parameters.getIsPrivate())
							? await parameters.getDriveKey({
									driveId: await arDrive.getDriveIdForFolderId(parentFolderId),
									drivePassword,
									useCache: true
							  })
							: undefined;

						customContentType ??= parameters.getParameterValue(CustomContentTypeParameter);

						return {
							wrappedEntity,
							driveKey,
							destFolderId: parentFolderId,
							destName: destinationFileName,
							customContentType
						};
					}
				)
			);

			const results = await arDrive.uploadAllEntities({
				entitiesToUpload: uploadStats,
				conflictResolution,
				prompts: folderUploadConflictPrompts
			});

			console.log(JSON.stringify(results, null, 4));
			return SUCCESS_EXIT_CODE;
		}

		console.log(`No files to upload`);
		return ERROR_EXIT_CODE;
	})
});
