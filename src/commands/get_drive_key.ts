import { EID, urlEncodeHashKey } from 'ardrive-core-js';
import { cliArDriveFactory } from '..';
import { CLICommand, ParametersHelper } from '../CLICommand';
import { CLIAction } from '../CLICommand/action';
import { DriveCreationPrivacyParameters, DriveIdParameter, NoVerifyParameter } from '../parameter_declarations';

new CLICommand({
	name: 'get-drive-key',
	parameters: [...DriveCreationPrivacyParameters, DriveIdParameter, NoVerifyParameter],
	action: new CLIAction(async function action(options) {
		const parameters = new ParametersHelper(options);
		const driveId = EID(parameters.getRequiredParameterValue(DriveIdParameter));
		const driveKey = await parameters.getDriveKey({ driveId });
		if (options.verify) {
			const arDrive = cliArDriveFactory({ wallet: await parameters.getRequiredWallet() });
			await arDrive.getPrivateDrive({ driveId, driveKey });
		}
		console.log(urlEncodeHashKey(driveKey));
	})
});
