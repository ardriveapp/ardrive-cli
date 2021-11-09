import { ArFSFileToUpload, ArFSFolderToUpload, isFolder, wrapFileOrFolder } from '../arfs_file_wrapper';
import { arDriveFactory } from '..';
import { CLICommand, ParametersHelper } from '../CLICommand';
import {
	BoostParameter,
	DestinationFileNameParameter,
	DrivePrivacyParameters,
	DryRunParameter,
	LocalFilePathParameter,
	LocalFilesParameter,
	ParentFolderIdParameter,
	WalletFileParameter
} from '../parameter_declarations';
import { DriveKey, EID, FolderID } from '../types';
import { readJWKFile } from '../utils';
import { ERROR_EXIT_CODE, SUCCESS_EXIT_CODE } from '../CLICommand/error_codes';
import { CLIAction } from '../CLICommand/action';

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
		...DrivePrivacyParameters
	],
	action: new CLIAction(async function action(options) {
		const parameters = new ParametersHelper(options);
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

			if (!options.localFilePath) {
				throw new Error('Must provide a local file path!');
			}

			const parentFolderId: FolderID = parameters.getRequiredParameterValue(ParentFolderIdParameter, EID);
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

			const arDrive = arDriveFactory({
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
								return arDrive.createPrivateFolderAndUploadChildren(
									parentFolderId,
									wrappedEntity,
									driveKey,
									destinationFileName
								);
							} else {
								return arDrive.uploadPrivateFile(
									parentFolderId,
									wrappedEntity,
									driveKey,
									destinationFileName
								);
							}
						} else {
							if (isFolder(wrappedEntity)) {
								return arDrive.createPublicFolderAndUploadChildren(
									parentFolderId,
									wrappedEntity,
									destinationFileName
								);
							} else {
								return arDrive.uploadPublicFile(parentFolderId, wrappedEntity, destinationFileName);
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
	})
});
