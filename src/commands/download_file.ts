import { EID } from 'ardrive-core-js';
// import { statSync } from 'fs';
// import { join as joinPath, parse as parseFile, resolve as resolvePath } from 'path';
// import { cliArDriveAnonymousFactory, cliArDriveFactory } from '..';
import { CLICommand, ParametersHelper } from '../CLICommand';
import { CLIAction } from '../CLICommand/action';
import {
	DriveIdParameter,
	DrivePrivacyParameters,
	DryRunParameter,
	FileIdParameter,
	LocalFilePathParameter
} from '../parameter_declarations';

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
	name: 'download-file',
	parameters: [FileIdParameter, LocalFilePathParameter, DryRunParameter, DriveIdParameter, ...DrivePrivacyParameters],
	action: new CLIAction(async (options) => {
		const parameters = new ParametersHelper(options);
		// const dryRun = !!parameters.getParameterValue(DryRunParameter);
		const fileId = parameters.getRequiredParameterValue(FileIdParameter, EID);
		const localFilePath = parameters.getRequiredParameterValue(LocalFilePathParameter);
		if (await parameters.getIsPrivate()) {
			// const driveId = parameters.getRequiredParameterValue(DriveIdParameter);
			// const driveKey = await parameters.getDriveKey({ driveId: EID(driveId) });
			// const wallet = await parameters.getRequiredWallet();
			// const ardrive = cliArDriveFactory({
			// 	wallet,
			// 	feeMultiple: parameters.getOptionalBoostSetting(),
			// 	dryRun
			// });
			// const file = await ardrive.getPrivateFile({ fileId, driveKey });
			// const fullLocalFilePath = getFullFilePath(localFilePath, file.name);
			// await ardrive.downloadPrivateFile(file, fullLocalFilePath, driveKey);
			return Promise.resolve();
		} else {
			// const ardrive = cliArDriveAnonymousFactory({});
			// const file = await ardrive.getPublicFile({ fileId });
			// const fullLocalFilePath = getFullFilePath(localFilePath, file.name);
			// await ardrive.downloadPublicFile(file, fullLocalFilePath);
			return Promise.resolve();
		}
		console.log(`File with ID "${fileId}" was successfully download to "${localFilePath}"`);
	})
});
