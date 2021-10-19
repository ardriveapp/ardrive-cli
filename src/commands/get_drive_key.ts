import { CLICommand, ParametersHelper } from '../CLICommand';
import { DriveCreationPrivacyParameters, DriveIdParameter } from '../parameter_declarations';
import { urlEncodeHashKey } from '../utils';

new CLICommand({
	name: 'get-drive-key',
	parameters: [...DriveCreationPrivacyParameters, DriveIdParameter],
	async action(options) {
		const parameters = new ParametersHelper(options);
		const driveId = parameters.getRequiredParameterValue(DriveIdParameter);
		const driveKey = await parameters.getDriveKey({ driveId });
		console.log(urlEncodeHashKey(driveKey));
	}
});
