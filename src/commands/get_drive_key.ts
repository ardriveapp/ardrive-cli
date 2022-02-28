import { EID, urlEncodeHashKey } from 'ardrive-core-js';
import { cliArDriveFactory } from '..';
import { CLICommand, ParametersHelper } from '../CLICommand';
import { CLIAction } from '../CLICommand/action';
import {
	DriveCreationPrivacyParameters,
	DriveIdParameter,
	GatewayParameter,
	NoVerifyParameter
} from '../parameter_declarations';
import { getArweaveFromURL } from '../utils/get_arweave_for_url';

new CLICommand({
	name: 'get-drive-key',
	parameters: [...DriveCreationPrivacyParameters, DriveIdParameter, NoVerifyParameter, GatewayParameter],
	action: new CLIAction(async function action(options) {
		const parameters = new ParametersHelper(options);
		const driveId = EID(parameters.getRequiredParameterValue(DriveIdParameter));
		const driveKey = await parameters.getDriveKey({ driveId });
		if (options.verify) {
			const arweave = getArweaveFromURL(parameters.getGateway());
			const arDrive = cliArDriveFactory({ wallet: await parameters.getRequiredWallet(), arweave });
			await arDrive.getPrivateDrive({ driveId, driveKey });
		}
		console.log(urlEncodeHashKey(driveKey));
	})
});
