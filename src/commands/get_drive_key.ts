import { CLICommand, ParametersHelper } from '../CLICommand';
import {
	DriveIdParameter,
	PrivateParameter,
	UnsafeDrivePasswordParameter,
	WalletFileParameter
} from '../parameter_declarations';

new CLICommand({
	name: 'get-drive-key',
	parameters: [WalletFileParameter, DriveIdParameter, UnsafeDrivePasswordParameter, PrivateParameter],
	async action(options) {
		const parameters = new ParametersHelper(options);
		const driveId = await parameters.getRequiredParameterValue(DriveIdParameter);
		const driveKey = await parameters.getDriveKey({ driveId });
		console.log(driveKey.toString('base64').replace('=', ''));
	}
});
