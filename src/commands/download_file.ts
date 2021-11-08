import { statSync } from 'fs';
import { join as joinPath, parse as parseFile, resolve as resolvePath } from 'path';
import { arDriveAnonymousFactory } from '..';
import { CLICommand, ParametersHelper } from '../CLICommand';
import { CLIAction } from '../CLICommand/action';
import { DrivePrivacyParameters, FileIdParameter, LocalFilePathParameter } from '../parameter_declarations';
import { EID } from '../types';

// const fileCountRegExp = /_([0-9]+)$/;

function getFullFilePath(path: string, defaultFileName: string): string {
	const fullLocalFilePath = resolvePath(path);
	const parsedFile = parseFile(fullLocalFilePath);
	try {
		const fileStat = statSync(fullLocalFilePath);
		if (fileStat.isDirectory()) {
			return joinPath(fullLocalFilePath, defaultFileName);
		} else {
			// const fileName = parsedFile.name;
			// const fileNameMatch = fileName.match(fileCountRegExp);
			// const fileCount = fileNameMatch ? fileNameMatch[0] : 0;
			// const fileExtension = parsedFile.ext;
			console.log(`TODO: conflict name resolution for local files`);
			console.log(`Overriding "${fullLocalFilePath}"`);
			return `${fullLocalFilePath}`;
		}
	} catch (e) {
		const parentLocalFolder = parsedFile.dir;
		const dirStat = statSync(parentLocalFolder);
		if (dirStat.isDirectory()) {
			// The file does not exist, but the parent folder IS a directory
			return fullLocalFilePath;
		}
		throw new Error(`No such file or directory: ${parentLocalFolder}`);
	}
}

new CLICommand({
	name: 'download-file',
	parameters: [FileIdParameter, LocalFilePathParameter, ...DrivePrivacyParameters],
	action: new CLIAction(async (options) => {
		const parameters = new ParametersHelper(options);
		const fileId = parameters.getRequiredParameterValue(FileIdParameter);
		const localFilePath = parameters.getRequiredParameterValue(LocalFilePathParameter);
		if (await parameters.getIsPrivate()) {
			throw new Error(`Downloading private files is already not implemented!`);
		} else {
			const ardrive = arDriveAnonymousFactory();
			const file = await ardrive.getPublicFile(EID(fileId));
			const fullLocalFilePath = getFullFilePath(localFilePath, file.name);
			await ardrive.downloadPublicFile(file, fullLocalFilePath);
		}
		console.log(`File with ID "${fileId}" was successfully download to "${localFilePath}"`);
	})
});
