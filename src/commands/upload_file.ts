import glob from 'glob';
import { CLICommand, ParametersHelper } from '../CLICommand';
import {
	BoostParameter,
	ConflictResolutionParams,
	DestinationFileNameParameter,
	DrivePrivacyParameters,
	DryRunParameter,
	GlobParameter,
	LocalFilePathParameter,
	LocalFilesParameter,
	ParentFolderIdParameter,
	WalletFileParameter
} from '../parameter_declarations';
import { ERROR_EXIT_CODE, SUCCESS_EXIT_CODE } from '../CLICommand/error_codes';
import { CLIAction } from '../CLICommand/action';
import {
	FolderID,
	ArFSFileToUpload,
	ArFSFolderToUpload,
	DriveKey,
	wrapFileOrFolder,
	EID,
	readJWKFile,
	isFolder
} from 'ardrive-core-js';
import { cliArDriveFactory } from '..';

interface UploadFileParameter {
	parentFolderId: FolderID;
	wrappedEntity: ArFSFileToUpload | ArFSFolderToUpload;
	destinationFileName?: string;
	drivePassword?: string;
	driveKey?: DriveKey;
}

type FilePath = string;

new CLICommand({
	name: 'upload-file',
	parameters: [
		BoostParameter,
		DestinationFileNameParameter,
		DryRunParameter,
		GlobParameter,
		LocalFilePathParameter,
		LocalFilesParameter,
		ParentFolderIdParameter,
		...ConflictResolutionParams,
		...DrivePrivacyParameters
	],
	action: new CLIAction(async function action(options) {
		const parameters = new ParametersHelper(options);
		const globValue = parameters.getParameterValue(GlobParameter);

		const filesToUpload: UploadFileParameter[] = await (async function (): Promise<UploadFileParameter[]> {
			const localFiles = parameters.getParameterValue(LocalFilesParameter);
			if (localFiles) {
				const COLUMN_SEPARATOR = ',';
				const ROW_SEPARATOR = '.';
				const csvRows = localFiles.split(ROW_SEPARATOR);
				const fileParameters: UploadFileParameter[] = csvRows.map((row: string) => {
					const csvFields = row.split(COLUMN_SEPARATOR).map((f: string) => f.trim());
					const [_parentFolderId, localFilePath, destinationFileName, drivePassword, _driveKey] = csvFields;

					// TODO: Make CSV uploads more bulk performant
					const wrappedEntity = wrapFileOrFolder(localFilePath);
					const parentFolderId = EID(_parentFolderId);
					const driveKey = Buffer.from(_driveKey);

					return {
						parentFolderId,
						wrappedEntity,
						destinationFileName,
						drivePassword,
						driveKey
					};
				});

				return fileParameters;
			}

			const parentFolderId: FolderID = parameters.getRequiredParameterValue(ParentFolderIdParameter, EID);

			if (globValue) {
				const files = glob.sync(globValue);
				const globParameters = files.map((filePath: FilePath) => {
					const wrappedEntity = wrapFileOrFolder(filePath);

					return {
						parentFolderId,
						wrappedEntity,
						destinationFileName: options.destFileName as string
					};
				});

				return globParameters;
			}

			if (!options.localFilePath) {
				throw new Error('Must provide a local file path!');
			}

			const localFilePath = parameters.getRequiredParameterValue(LocalFilePathParameter, wrapFileOrFolder);
			const singleParameter = {
				parentFolderId: parentFolderId,
				wrappedEntity: localFilePath,
				destinationFileName: options.destFileName as string
			};

			return [singleParameter];
		})();
		if (filesToUpload.length) {
			const wallet = parameters.getRequiredParameterValue(WalletFileParameter, readJWKFile);

			const conflictResolution = parameters.getFileNameConflictResolution();

			const arDrive = cliArDriveFactory({
				wallet: wallet,
				feeMultiple: parameters.getOptionalBoostSetting(),
				dryRun: !!options.dryRun
			});

			await Promise.all(
				filesToUpload.map(async (fileToUpload) => {
					const {
						parentFolderId,
						wrappedEntity,
						destinationFileName,
						drivePassword,
						driveKey: fileDriveKey
					} = fileToUpload;

					const result = await (async () => {
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
									conflictResolution
								});
							} else {
								return arDrive.uploadPrivateFile({
									parentFolderId,
									wrappedFile: wrappedEntity,
									driveKey,
									destinationFileName,
									conflictResolution
								});
							}
						} else {
							if (isFolder(wrappedEntity)) {
								return arDrive.createPublicFolderAndUploadChildren({
									parentFolderId,
									wrappedFolder: wrappedEntity,
									destParentFolderName: destinationFileName,
									conflictResolution
								});
							} else {
								return arDrive.uploadPublicFile({
									parentFolderId,
									wrappedFile: wrappedEntity,
									destinationFileName,
									conflictResolution
								});
							}
						}
					})();
					if (globValue) {
						console.log(`\n${wrappedEntity.filePath}`);
					}
					console.log(JSON.stringify(result, null, 4));
				})
			);
			return SUCCESS_EXIT_CODE;
		}
		console.log(`No files to upload`);
		return ERROR_EXIT_CODE;
	})
});
