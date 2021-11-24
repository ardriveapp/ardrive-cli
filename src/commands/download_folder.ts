import { ArFSFolderToDownload, EID } from 'ardrive-core-js';
import { createWriteStream, mkdirSync, utimesSync } from 'fs';
import { join as joinPath, resolve } from 'path';
import { pipeline } from 'stream';
import { promisify } from 'util';
import { cliArDriveAnonymousFactory, cliArDriveFactory } from '..';
import { CLICommand, ParametersHelper } from '../CLICommand';
import { CLIAction } from '../CLICommand/action';
import {
	DriveIdParameter,
	DrivePrivacyParameters,
	DryRunParameter,
	FolderIdParameter,
	LocalFilePathParameter,
	MaxDepthParameter
} from '../parameter_declarations';
import { ProgressBar } from '../utils';

const pipelinePromise = promisify(pipeline);

new CLICommand({
	name: 'download-folder',
	parameters: [
		FolderIdParameter,
		LocalFilePathParameter,
		DryRunParameter,
		MaxDepthParameter,
		{ name: DriveIdParameter, required: false },
		...DrivePrivacyParameters
	],
	action: new CLIAction(async (options) => {
		const parameters = new ParametersHelper(options);
		const dryRun = !!parameters.getParameterValue(DryRunParameter);
		const folderId = parameters.getRequiredParameterValue(FolderIdParameter, EID);
		const localFilePath = parameters.getRequiredParameterValue(LocalFilePathParameter, resolve);
		const maxDepth = await parameters.getMaxDepth(Number.MAX_SAFE_INTEGER);
		let folderToDownload: ArFSFolderToDownload;

		if (await parameters.getIsPrivate()) {
			const driveId = parameters.getRequiredParameterValue(DriveIdParameter, EID);
			const driveKey = await parameters.getDriveKey({ driveId });
			const wallet = await parameters.getRequiredWallet();
			const ardrive = cliArDriveFactory({
				wallet,
				feeMultiple: parameters.getOptionalBoostSetting(),
				dryRun
			});
			folderToDownload = await ardrive.downloadPrivateFolder(folderId, maxDepth, driveKey);
		} else {
			const ardrive = cliArDriveAnonymousFactory({});
			folderToDownload = await ardrive.downloadPublicFolder(folderId, maxDepth);
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
		console.log(`Folder with ID "${folderId}" was successfully download to "${localFilePath}"`);
	})
});
