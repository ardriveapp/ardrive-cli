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
	ParentFolderIdParameter
} from '../parameter_declarations';
import { FeeMultiple } from '../types';
import { readJWKFile } from '../utils';

/* eslint-disable no-console */

interface UploadFileParameter {
	parentFolderId: string;
	wrappedEntity: ArFSFileToUpload | ArFSFolderToUpload;
	destinationFileName?: string;
	drivePassword?: string;
	driveKey?: string;
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
	async action(options) {
		const filesToUpload: UploadFileParameter[] = (function (): UploadFileParameter[] {
			if (options.drivePassword && options.driveKey) {
				console.log(`Can not use --drive-password in conjunction with --drive-key`);
				process.exit(1);
			}
			if (options.localFiles) {
				if (options.localFilePath) {
					console.log(`Can not use --local-files in conjunction with --localFilePath`);
					process.exit(1);
				}

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
			const singleParameter = {
				parentFolderId: options.parentFolderId,
				wrappedEntity: wrapFileOrFolder(options.localFilePath),
				destinationFileName: options.destFileName,
				drivePassword: options.drivePassword,
				driveKey: options.driveKey
			};
			if (!options.parentFolderId || !options.localFilePath) {
				console.log(`Bad file: ${JSON.stringify(singleParameter)}`);
				process.exit(1);
			}
			return [singleParameter];
		})();
		if (filesToUpload.length) {
			const parameters = new ParametersHelper(options);

			const wallet = readJWKFile(options.walletFile);

			const arDrive = arDriveFactory({
				wallet: wallet,
				feeMultiple: options.boost as FeeMultiple,
				dryRun: options.dryRun
			});

			await Promise.all(
				filesToUpload.map(async (fileToUpload) => {
					const { parentFolderId, wrappedEntity, destinationFileName } = fileToUpload;

					const result = await (async () => {
						if (await parameters.getIsPrivate()) {
							const driveId = await arDrive.getDriveIdForFolderId(parentFolderId);
							const driveKey = await parameters.getDriveKey(driveId);

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
			process.exit(0);
		}
		console.log(`No files to upload`);
		process.exit(1);
	}
});
