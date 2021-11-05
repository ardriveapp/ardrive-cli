import { ArFSFileToUpload, ArFSFolderToUpload, isFolder, wrapFileOrFolder } from '../arfs_file_wrapper';
import { arDriveFactory } from '..';
import { CLICommand, ParametersHelper } from '../CLICommand';
import {
	BoostParameter,
	ConflictResolutionParams,
	DestinationFileNameParameter,
	DrivePrivacyParameters,
	DryRunParameter,
	LocalFilePathParameter,
	LocalFilesParameter,
	ParentFolderIdParameter
} from '../parameter_declarations';
import { DriveKey, FeeMultiple, FolderID } from '../types';
import { readJWKFile } from '../utils';
import { ERROR_EXIT_CODE, SUCCESS_EXIT_CODE } from '../CLICommand/constants';
import { fileNameConflictAskPrompt } from '../prompts';

interface UploadFileParameter {
	parentFolderId: FolderID;
	wrappedEntity: ArFSFileToUpload | ArFSFolderToUpload;
	destinationFileName?: string;
	drivePassword?: string;
	driveKey?: DriveKey;
}

new CLICommand({
	name: 'upload-file',
	parameters: [
		ParentFolderIdParameter,
		LocalFilePathParameter,
		DestinationFileNameParameter,
		LocalFilesParameter,
		BoostParameter,
		DryRunParameter,
		...ConflictResolutionParams,
		...DrivePrivacyParameters
	],
	async action(options) {
		const filesToUpload: UploadFileParameter[] = await (async function (): Promise<UploadFileParameter[]> {
			if (options.localFiles) {
				const COLUMN_SEPARATOR = ',';
				const ROW_SEPARATOR = '.';
				const csvRows = options.localFiles.split(ROW_SEPARATOR);
				const fileParameters: UploadFileParameter[] = csvRows.map((row: string) => {
					const csvFields = row.split(COLUMN_SEPARATOR).map((f: string) => f.trim());
					const [parentFolderId, localFilePath, destinationFileName, drivePassword, driveKey] = csvFields;

					// TODO: Make CSV uploads more bulk performant
					const wrappedEntity = wrapFileOrFolder(localFilePath);

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

			if (!options.localFilePath) {
				throw new Error('Must provide a local file path!');
			}

			const singleParameter = {
				parentFolderId: options.parentFolderId,
				wrappedEntity: wrapFileOrFolder(options.localFilePath),
				destinationFileName: options.destFileName
			};

			return [singleParameter];
		})();
		if (filesToUpload.length) {
			const parameters = new ParametersHelper(options);

			const wallet = readJWKFile(options.walletFile);

			const conflictResolution = parameters.getFileNameConflictResolution();

			const arDrive = arDriveFactory({
				wallet: wallet,
				feeMultiple: options.boost as FeeMultiple,
				dryRun: options.dryRun
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
									conflictResolution,
									fileNameConflictAskPrompt
								});
							} else {
								return arDrive.uploadPrivateFile({
									parentFolderId,
									wrappedFile: wrappedEntity,
									driveKey,
									destinationFileName,
									conflictResolution,
									fileNameConflictAskPrompt
								});
							}
						} else {
							if (isFolder(wrappedEntity)) {
								return arDrive.createPublicFolderAndUploadChildren({
									parentFolderId,
									wrappedFolder: wrappedEntity,
									destParentFolderName: destinationFileName,
									conflictResolution,
									fileNameConflictAskPrompt
								});
							} else {
								return arDrive.uploadPublicFile({
									parentFolderId,
									wrappedFile: wrappedEntity,
									destinationFileName,
									conflictResolution,
									fileNameConflictAskPrompt
								});
							}
						}
					})();
					console.log(JSON.stringify(result, null, 4));
				})
			);
			return SUCCESS_EXIT_CODE;
		}
		console.log(`No files to upload`);
		return ERROR_EXIT_CODE;
	}
});
