import { EID } from 'ardrive-core-js';
import { Stats, statSync } from 'fs';
import { join as joinPath, parse as parsePath, resolve as resolvePath } from 'path';
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
		const localFilePath = parameters.getParameterValue(LocalFilePathParameter) || './';
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
			const fullLocalFilePath = getAbsoluteFilePath(localFilePath, file.name);
			await ardrive.downloadPrivateFile(file, fullLocalFilePath, driveKey);
		} else {
			const ardrive = cliArDriveAnonymousFactory({});
			const file = await ardrive.getPublicFile({ fileId });
			const fullLocalFilePath = getAbsoluteFilePath(localFilePath, file.name);
			await ardrive.downloadPublicFile(file, fullLocalFilePath);
		}
		console.log(`File with ID "${fileId}" was successfully download to "${localFilePath}"`);
	})
});
