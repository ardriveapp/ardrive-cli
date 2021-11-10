import { resolve } from 'path';
import { arDriveAnonymousFactory, arDriveFactory } from '..';
import { CLICommand, ParametersHelper } from '../CLICommand';
import { CLIAction } from '../CLICommand/action';
import {
	DriveIdParameter,
	DrivePrivacyParameters,
	DryRunParameter,
	FolderIdParameter,
	LocalFilePathParameter
} from '../parameter_declarations';
import { EID } from '../types';

// const fileCountRegExp = /_([0-9]+)$/;

// function getFullFilePath(path: string, defaultFileName: string): string {
// 	const fullLocalFilePath = resolvePath(path);
// 	const parsedFile = parseFile(fullLocalFilePath);
// 	try {
// 		const fileStat = statSync(fullLocalFilePath);
// 		if (fileStat.isDirectory()) {
// 			return joinPath(fullLocalFilePath, defaultFileName);
// 		} else {
// 			// const fileName = parsedFile.name;
// 			// const fileNameMatch = fileName.match(fileCountRegExp);
// 			// const fileCount = fileNameMatch ? fileNameMatch[0] : 0;
// 			// const fileExtension = parsedFile.ext;
// 			console.log(`TODO: conflict name resolution for local files`);
// 			console.log(`Overriding "${fullLocalFilePath}"`);
// 			return `${fullLocalFilePath}`;
// 		}
// 	} catch (e) {
// 		const parentLocalFolder = parsedFile.dir;
// 		const dirStat = statSync(parentLocalFolder);
// 		if (dirStat.isDirectory()) {
// 			// The file does not exist, but the parent folder IS a directory
// 			return fullLocalFilePath;
// 		}
// 		throw new Error(`No such file or directory: ${parentLocalFolder}`);
// 	}
// }

new CLICommand({
	name: 'download-folder',
	parameters: [
		FolderIdParameter,
		LocalFilePathParameter,
		DryRunParameter,
		{ name: DriveIdParameter, required: false },
		...DrivePrivacyParameters
	],
	action: new CLIAction(async (options) => {
		const parameters = new ParametersHelper(options);
		const dryRun = !!parameters.getParameterValue(DryRunParameter);
		const folderId = parameters.getRequiredParameterValue(FolderIdParameter, EID);
		const localFilePath = parameters.getRequiredParameterValue(LocalFilePathParameter, resolve);
		const maxDepth = await parameters.getMaxDepth();

		if (await parameters.getIsPrivate()) {
			const driveId = parameters.getRequiredParameterValue(DriveIdParameter, EID);
			const driveKey = await parameters.getDriveKey({ driveId });
			const wallet = await parameters.getRequiredWallet();
			const ardrive = arDriveFactory({
				wallet,
				feeMultiple: parameters.getOptionalBoostSetting(),
				dryRun
			});
			await ardrive.downloadPrivateFolder(folderId, maxDepth, localFilePath, driveKey);
		} else {
			const ardrive = arDriveAnonymousFactory();
			await ardrive.downloadPublicFolder(folderId, maxDepth, localFilePath);
		}
		console.log(`Folder with ID "${folderId}" was successfully download to "${localFilePath}"`);
	})
});
