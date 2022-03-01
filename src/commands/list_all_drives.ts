import { ArFSDriveEntity } from 'ardrive-core-js';
import { cliArDriveAnonymousFactory, cliWalletDao } from '..';
import { CLICommand, ParametersHelper } from '../CLICommand';
import { CLIAction } from '../CLICommand/action';
import { SUCCESS_EXIT_CODE } from '../CLICommand/error_codes';
import { AddressParameter, DrivePrivacyParameters, GatewayParameter } from '../parameter_declarations';
import { getArweaveFromURL } from '../utils/get_arweave_for_url';

new CLICommand({
	name: 'list-all-drives',
	parameters: [AddressParameter, ...DrivePrivacyParameters, GatewayParameter],
	action: new CLIAction(async function action(options) {
		const parameters = new ParametersHelper(options, cliWalletDao);
		const arweave = getArweaveFromURL(parameters.getGateway());
		const ardrive = cliArDriveAnonymousFactory({ arweave });

		const address = await parameters.getWalletAddress();
		const privateKeyData = await parameters.getPrivateKeyData();

		const drives: Partial<ArFSDriveEntity>[] = await ardrive.getAllDrivesForAddress({ address, privateKeyData });

		// Display data
		console.log(JSON.stringify(drives, null, 4));

		return SUCCESS_EXIT_CODE;
	})
});
