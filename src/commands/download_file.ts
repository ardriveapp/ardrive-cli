import { arDriveAnonymousFactory } from '..';
import { CLICommand, ParametersHelper } from '../CLICommand';
import { CLIAction } from '../CLICommand/action';
import { DrivePrivacyParameters, FileIdParameter, LocalFilePathParameter } from '../parameter_declarations';
import { EID } from '../types';

new CLICommand({
	name: 'download-file',
	parameters: [FileIdParameter, LocalFilePathParameter, ...DrivePrivacyParameters],
	action: new CLIAction(async (options) => {
		const parameters = new ParametersHelper(options);
		const fileId = parameters.getRequiredParameterValue(FileIdParameter);
		const localFilePath = parameters.getRequiredParameterValue(LocalFilePathParameter);
		if (!(await parameters.getIsPrivate())) {
			const ardrive = arDriveAnonymousFactory();
			const file = await ardrive.getPublicFile(EID(fileId));
			await ardrive.downloadPublicFile(file, localFilePath);
		} else {
			throw new Error(`Not implemented!`);
		}
	})
});
