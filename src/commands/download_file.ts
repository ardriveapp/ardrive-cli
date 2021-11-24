import { ArFSFileToDownload, EID } from 'ardrive-core-js';
import { createWriteStream, Stats, statSync, utimesSync } from 'fs';
import { join as joinPath, parse as parsePath, resolve as resolvePath } from 'path';
import { pipeline } from 'stream';
import { promisify } from 'util';
import { cliArDriveAnonymousFactory, cliArDriveFactory } from '..';
import { CLICommand, ParametersHelper } from '../CLICommand';
import { CLIAction } from '../CLICommand/action';
import {
	DriveIdParameter,
	DrivePrivacyParameters,
	DryRunParameter,
	FileIdParameter,
	LocalFilePathParameter
} from '../parameter_declarations';
import { ProgressBar } from '../utils';

const pipelinePromise = promisify(pipeline);

/**
 * Gets the full file name
 * @param path - the relative or absolute path of a directory or a file -existent or not- contained in an existing directory
 * @param defaultFileName - the known file name; only used when the path is a directory
 * @throws - if the parent folder does not exist
 * @returns - the verified absolute path as a string
 */
function getAbsoluteFilePath(path: string, defaultFileName: string): string {
	const fullLocalFilePath = resolvePath(path);
	const parsedFile = parsePath(fullLocalFilePath);
	let fileStat: Stats;
	try {
		fileStat = statSync(fullLocalFilePath);
	} catch (e) {
		const parentLocalFolder = parsedFile.dir;
		const dirStat = statSync(parentLocalFolder);
		if (dirStat.isDirectory()) {
			// The file does not exist and the parent folder IS a directory
			return fullLocalFilePath;
		}
		throw new Error(`No such file or directory: ${parentLocalFolder}`);
	}
	if (fileStat.isDirectory()) {
		// the file does exist and is a directory
		return joinPath(fullLocalFilePath, defaultFileName);
	} else {
		// the file does exist
		return fullLocalFilePath;
	}
}

new CLICommand({
	name: 'download-file',
	parameters: [FileIdParameter, LocalFilePathParameter, DryRunParameter, DriveIdParameter, ...DrivePrivacyParameters],
	action: new CLIAction(async (options) => {
		const parameters = new ParametersHelper(options);
		const dryRun = !!parameters.getParameterValue(DryRunParameter);
		const fileId = parameters.getRequiredParameterValue(FileIdParameter, EID);
		const localFilePath = resolvePath(parameters.getParameterValue(LocalFilePathParameter) || './');
		let fileToDownload: ArFSFileToDownload;

		if (await parameters.getIsPrivate()) {
			const driveId = parameters.getRequiredParameterValue(DriveIdParameter);
			const driveKey = await parameters.getDriveKey({ driveId: EID(driveId) });
			const wallet = await parameters.getRequiredWallet();
			const ardrive = cliArDriveFactory({
				wallet,
				feeMultiple: parameters.getOptionalBoostSetting(),
				dryRun
			});
			const file = await ardrive.getPrivateFile({ fileId, driveKey });
			const allEntitiesOnDrive = await ardrive.listPrivateFolder({ folderId: file.parentFolderId, driveKey });
			const fileWithPaths = allEntitiesOnDrive.find((entity) => entity.entityId.equals(file.fileId));
			if (!fileWithPaths) {
				throw new Error(`Could not retreive the private file with id: ${file.fileId}`);
			}
			const cipherIv = await ardrive.getCipherIVOfPrivateTransactionID(file.dataTxId);
			fileToDownload = new ArFSFileToDownload(ardrive, fileWithPaths, driveKey, cipherIv);
		} else {
			const ardrive = cliArDriveAnonymousFactory({});
			const file = await ardrive.getPublicFile({ fileId });
			const allEntitiesOnDrive = ardrive.listPublicFolder({ folderId: file.parentFolderId });
			const fileWithPaths = (await allEntitiesOnDrive).find((entity) => entity.entityId.equals(file.fileId));
			if (!fileWithPaths) {
				throw new Error(`Could not retreive the public file with id: ${file.fileId}`);
			}
			fileToDownload = new ArFSFileToDownload(ardrive, fileWithPaths);
		}
		const fullLocalFilePath = getAbsoluteFilePath(localFilePath, fileToDownload.fileEntity.name);
		const remoteFileLastModifiedDate = Math.ceil(+fileToDownload.fileEntity.lastModifiedDate / 1000);
		const dataStream = await fileToDownload.getDataStream();
		const downloadProgressBar = new ProgressBar(fileToDownload.length, 1, 1);
		const progressBarStream = downloadProgressBar.passThroughStream;
		const decryptingStream = await fileToDownload.getDecryptingStream();
		const writeStream = createWriteStream(fullLocalFilePath);
		await pipelinePromise(dataStream, progressBarStream, decryptingStream, writeStream).finally(() => {
			// update the last-modified-date
			const accessTime = Date.now();
			utimesSync(fullLocalFilePath, accessTime, remoteFileLastModifiedDate);
		});
		console.log(`File with ID "${fileId}" was successfully download to "${localFilePath}"`);
	})
});
