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
	CustomMetaDataParameters,
	IPFSParameter
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
	ArDriveUploadStats,
	CustomMetaData
} from 'ardrive-core-js';
import { cliArDriveFactory } from '..';
import * as fs from 'fs';
import { getArweaveFromURL } from '../utils/get_arweave_for_url';
import { deriveIpfsCid } from '../utils/ipfs_utils';

interface UploadPathParameter {
	parentFolderId: FolderID;
	wrappedEntity: ArFSFileToUpload | ArFSFolderToUpload;
	destinationFileName?: string;
	drivePassword?: string;
	driveKey?: DriveKey;
}

interface GetCustomMetaDataWithIpfsCidParameter {
	customMetaData?: CustomMetaData;
	localFilePath: FilePath;
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

async function getFileList(
	parameters: ParametersHelper,
	parentFolderId: FolderID
): Promise<UploadPathParameter[] | undefined> {
	const localPaths = parameters.getParameterValue<string[]>(LocalPathsParameter);
	if (!localPaths) {
		return undefined;
	}
	const customContentType = parameters.getParameterValue(CustomContentTypeParameter);
	const customMetaData = parameters.getCustomMetaData();

	const localPathsToUpload = localPaths.map(async (filePath: FilePath) => {
		const customMetaDataWithIipfsFlag = await (async function () {
			const ipfsFlag = parameters.getParameterValue(IPFSParameter);
			return ipfsFlag
				? await getCustomMetaDataWithIpfsCid({ customMetaData, localFilePath: filePath })
				: customMetaData;
		})();
		const wrappedEntity = wrapFileOrFolder(filePath, customContentType, customMetaDataWithIipfsFlag);

		return {
			parentFolderId,
			wrappedEntity
		};
	});

	return Promise.all(localPathsToUpload);
}

async function getSingleFile(parameters: ParametersHelper, parentFolderId: FolderID): Promise<UploadPathParameter[]> {
	// NOTE: Single file is the last possible use case. Throw exception if the parameter isn't found.
	const localFilePath =
		parameters.getParameterValue(LocalFilePathParameter_DEPRECATED) ??
		parameters.getRequiredParameterValue<string>(LocalPathParameter);

	const customContentType = parameters.getParameterValue(CustomContentTypeParameter);
	const customMetaData = await (async function () {
		const customMetaData = parameters.getCustomMetaData();
		const ipfsFlag = parameters.getParameterValue(IPFSParameter);
		return ipfsFlag ? await getCustomMetaDataWithIpfsCid({ customMetaData, localFilePath }) : customMetaData;
	})();

	const wrappedEntity = wrapFileOrFolder(localFilePath, customContentType, customMetaData);
	const singleParameter = {
		parentFolderId: parentFolderId,
		wrappedEntity,
		destinationFileName: parameters.getParameterValue(DestinationFileNameParameter)
	};

	return [singleParameter];
}

async function getCustomMetaDataWithIpfsCid({
	customMetaData,
	localFilePath
}: GetCustomMetaDataWithIpfsCidParameter): Promise<CustomMetaData> {
	const customMetaDataClone: CustomMetaData = Object.assign({}, customMetaData);

	const customIpfsTag = customMetaDataClone.dataGqlTags?.['IPFS-Add'];
	if (customIpfsTag) {
		throw new Error(
			`You cannot pass the --add-ipfs-tag flag and set the custom IPFS-Add metadata item. Found: { 'IPFS-Add': ${JSON.stringify(
				customIpfsTag
			)}}`
		);
	} else {
		const fileContent = fs.readFileSync(localFilePath);
		const cidHash = await deriveIpfsCid(fileContent);

		if (!customMetaDataClone.dataGqlTags) {
			customMetaDataClone.dataGqlTags = {};
		}
		customMetaDataClone.dataGqlTags['IPFS-Add'] = cidHash;
	}

	return customMetaDataClone;
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
		IPFSParameter
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
			const fileList = await getFileList(parameters, parentFolderId);
			if (fileList) {
				return fileList;
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
			return SUCCESS_EXIT_CODE;
		}

		console.log(`No files to upload`);
		return ERROR_EXIT_CODE;
	})
});
