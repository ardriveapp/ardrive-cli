import { ArFSFolderToDownload, EID } from 'ardrive-core-js';
import { join as joinPath, resolve as resolvePath } from 'path';
import { CLICommand, ParametersHelper } from '../CLICommand';
import { CLIAction } from '../CLICommand/action';
import {
	DriveIdParameter,
	DrivePrivacyParameters,
	DryRunParameter,
	LocalFilePathParameter,
	MaxDepthParameter
} from '../parameter_declarations';
import { cliArDriveFactory, cliArDriveAnonymousFactory } from '..';
import { ProgressBar } from '../utils';
import { createWriteStream, mkdirSync, utimesSync } from 'fs';
import { pipeline } from 'stream';
import { promisify } from 'util';

const pipelinePromise = promisify(pipeline);

new CLICommand({
	name: 'download-drive',
	parameters: [
		DriveIdParameter,
		LocalFilePathParameter,
		DryRunParameter,
		MaxDepthParameter,
		...DrivePrivacyParameters
	],
	action: new CLIAction(async (options) => {
		const parameters = new ParametersHelper(options);
		const dryRun = !!parameters.getParameterValue(DryRunParameter);
		const driveId = parameters.getRequiredParameterValue(DriveIdParameter, EID);
		const localFilePath = parameters.getRequiredParameterValue(LocalFilePathParameter, resolvePath);
		const maxDepth = await parameters.getMaxDepth(Number.MAX_SAFE_INTEGER);
		let folderToDownload: ArFSFolderToDownload;

		if (await parameters.getIsPrivate()) {
			const driveKey = await parameters.getDriveKey({ driveId });
			const wallet = await parameters.getRequiredWallet();
			const ardrive = cliArDriveFactory({
				wallet,
				feeMultiple: parameters.getOptionalBoostSetting(),
				dryRun
			});
			const drive = await ardrive.getPrivateDrive({ driveId, driveKey });
			folderToDownload = await ardrive.downloadPrivateFolder(drive.rootFolderId, maxDepth, driveKey);
		} else {
			const ardrive = cliArDriveAnonymousFactory({});
			const drive = await ardrive.getPublicDrive({ driveId });
			folderToDownload = await ardrive.downloadPublicFolder(drive.rootFolderId, maxDepth);
		}

		// setup the folder structure
		folderToDownload.folders.forEach((folder) => {
			const relativePath = folderToDownload.getRelativePath(folder);
			const fullPath = joinPath(localFilePath, relativePath);
			mkdirSync(fullPath);
		});

		// sequentially download the data on chain
		for (const [index, file] of folderToDownload.files.entries()) {
			const remoteFileLastModifiedDate = Math.ceil(+file.fileEntity.lastModifiedDate / 1000);
			const relativePath = folderToDownload.getRelativePath(file.fileEntity);
			const fullPath = joinPath(localFilePath, relativePath);
			const dataStream = await file.getDataStream();
			const downloadProgressBar = new ProgressBar(file.length, index + 1, folderToDownload.files.length);
			const progressBarStream = downloadProgressBar.passThroughStream;
			const decryptingStream = await file.getDecryptingStream();
			const writeStream = createWriteStream(fullPath);
			await pipelinePromise(dataStream, progressBarStream, decryptingStream, writeStream).finally(() => {
				// update the last-modified-date
				utimesSync(fullPath, Date.now(), remoteFileLastModifiedDate);
			});
		}
		console.log(`Drive with ID "${driveId}" was successfully download to "${localFilePath}"`);
	})
});
