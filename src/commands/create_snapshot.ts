import { CLICommand, ParametersHelper } from '../CLICommand';
import {
	BoostParameter,
	DryRunParameter,
	DrivePrivacyParameters,
	GatewayParameter,
	DriveIdParameter
} from '../parameter_declarations';
import { SUCCESS_EXIT_CODE } from '../CLICommand/error_codes';
import { CLIAction } from '../CLICommand/action';
import { constructSnapshotData } from '../utils/snapshots/create_snapshot';
import { EID, GatewayAPI, gatewayUrlForArweave, Wallet } from 'ardrive-core-js';
import { cliArweave } from '..';

new CLICommand({
	name: 'create-snapshot',
	parameters: [DriveIdParameter, BoostParameter, DryRunParameter, ...DrivePrivacyParameters, GatewayParameter],
	action: new CLIAction(async function action(options) {
		const parameters = new ParametersHelper(options);
		const wallet: Wallet = await parameters.getRequiredWallet();

		const driveId = parameters.getRequiredParameterValue(DriveIdParameter, EID);

		const owner = await wallet.getAddress();
		const result = await constructSnapshotData({
			owner,
			driveId,
			gatewayApi: new GatewayAPI({ gatewayUrl: gatewayUrlForArweave(cliArweave) })
		});

		console.log(JSON.stringify(result, null, 4));

		return SUCCESS_EXIT_CODE;
	})
});
