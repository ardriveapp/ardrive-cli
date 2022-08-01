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
	LocalPathParameter,
	LocalCSVParameter,
	GatewayParameter,
	CustomContentTypeParameter,
	RemotePathParameter,
	CustomMetaDataParameters
} from '../parameter_declarations';
import { fileAndFolderUploadConflictPrompts } from '../prompts';
import { ERROR_EXIT_CODE, SUCCESS_EXIT_CODE } from '../CLICommand/error_codes';
import { CLIAction } from '../CLICommand/action';
import {
	FolderID,
	ArFSFileToUpload,
	ArFSFolderToUpload,
	DriveKey,
	wrapFileOrFolder,
	EID,
	EntityKey,
	ArDriveUploadStats
} from 'ardrive-core-js';
import { cliArDriveFactory } from '..';
import * as fs from 'fs';
import { getArweaveFromURL } from '../utils/get_arweave_for_url';
import { cleanUpTempFolder, getTempFolder } from '../utils/temp';
import { download } from '../utils/download';

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
		// prettier-ignore
		const [localFilePath, destinationFileName, _parentFolderId, drivePassword, _driveKey, _customContentType] =
			csvFields;

		const customContentType = _customContentType ?? parameters.getParameterValue(CustomContentTypeParameter);

		// TODO: Make CSV uploads more bulk performant
		// TODO: Make CSV work with custom metadata -- Question: How to apply this? Do we only allow metadata JSON file paths for CSV? Do we accept a stringified JSON object directly in the CSV?
		const wrappedEntity = wrapFileOrFolder(localFilePath, customContentType);
		const parentFolderId = EID(
			_parentFolderId ? _parentFolderId : parameters.getRequiredParameterValue(ParentFolderIdParameter)
		);
		const driveKey = _driveKey ? new EntityKey(Buffer.from(_driveKey)) : undefined;

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
	const customContentType = parameters.getParameterValue(CustomContentTypeParameter);
	const customMetaData = parameters.getCustomMetaData();

	const localPathsToUpload = localPaths.map((filePath: FilePath) => {
		const wrappedEntity = wrapFileOrFolder(filePath, customContentType, customMetaData);

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
		parameters.getParameterValue(LocalFilePathParameter_DEPRECATED) ??
		parameters.getRequiredParameterValue<string>(LocalPathParameter);

	const customContentType = parameters.getParameterValue(CustomContentTypeParameter);
	const customMetaData = parameters.getCustomMetaData();

	const wrappedEntity = wrapFileOrFolder(localFilePath, customContentType, customMetaData);
	const singleParameter = {
		parentFolderId: parentFolderId,
		wrappedEntity,
		destinationFileName: parameters.getParameterValue(DestinationFileNameParameter)
	};

	return [singleParameter];
}

async function getRemoteFile(
	parameters: ParametersHelper,
	parentFolderId: FolderID
): Promise<UploadPathParameter[] | undefined> {
	const remoteFilePath = parameters.getParameterValue(RemotePathParameter);

	if (!remoteFilePath) {
		return undefined;
	}

	const tempFolder = getTempFolder();

	const localFilePath = await download(remoteFilePath, tempFolder);

	const customContentType = parameters.getParameterValue(CustomContentTypeParameter);

	const wrappedEntity = wrapFileOrFolder(localFilePath, customContentType);
	const singleParameter = {
		parentFolderId: parentFolderId,
		wrappedEntity,
		destinationFileName: parameters.getParameterValue(DestinationFileNameParameter)
	};

	return [singleParameter];
}

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
		...CustomMetaDataParameters,
		LocalFilePathParameter_DEPRECATED,
		LocalFilesParameter_DEPRECATED,
		BoostParameter,
		GatewayParameter,
		RemotePathParameter
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
			const filesFromRemote = await getRemoteFile(parameters, parentFolderId);
			if (filesFromRemote) {
				return filesFromRemote;
			}

			// If neither the multi-file input case or csv case produced files, try the single file case (deprecated)
			return getSingleFile(parameters, parentFolderId);
		})();
		if (filesToUpload.length) {
			const wallet = await parameters.getRequiredWallet();

			const conflictResolution = parameters.getFileNameConflictResolution();
			const shouldBundle = !!parameters.getParameterValue(ShouldBundleParameter);

			const arweave = getArweaveFromURL(parameters.getGateway());

			const arDrive = cliArDriveFactory({
				wallet,
				feeMultiple: parameters.getOptionalBoostSetting(),
				dryRun: parameters.isDryRun(),
				shouldBundle,
				arweave
			});

			const uploadStats: ArDriveUploadStats[] = await (async () => {
				const uploadStats: ArDriveUploadStats[] = [];

				for (const {
					parentFolderId,
					wrappedEntity,
					destinationFileName,
					driveKey,
					drivePassword
				} of filesToUpload) {
					uploadStats.push({
						wrappedEntity,
						driveKey:
							driveKey ?? (await parameters.getIsPrivate())
								? await parameters.getDriveKey({
										driveId: await arDrive.getDriveIdForFolderId(parentFolderId),
										drivePassword,
										useCache: true
								  })
								: undefined,
						destFolderId: parentFolderId,
						destName: destinationFileName
					});
				}

				return uploadStats;
			})();

			const results = await arDrive.uploadAllEntities({
				entitiesToUpload: uploadStats,
				conflictResolution,
				prompts: fileAndFolderUploadConflictPrompts
			});

			console.log(JSON.stringify(results, null, 4));
			cleanUpTempFolder();
			return SUCCESS_EXIT_CODE;
		}

		console.log(`No files to upload`);
		return ERROR_EXIT_CODE;
	})
});
