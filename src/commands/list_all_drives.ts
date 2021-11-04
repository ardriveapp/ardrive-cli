import { ArFSDriveEntity } from 'ardrive-core-js';
import { arDriveAnonymousFactory, cliWalletDao } from '..';
import { CLICommand, ParametersHelper } from '../CLICommand';
import { CLIAction } from '../CLICommand/action';
import { SUCCESS_EXIT_CODE } from '../CLICommand/error_codes';
import { AddressParameter, DrivePrivacyParameters } from '../parameter_declarations';

new CLICommand({
	name: 'list-all-drives',
	parameters: [AddressParameter, ...DrivePrivacyParameters],
	action: new CLIAction(async function action(options) {
		const parameters = new ParametersHelper(options, cliWalletDao);
		const ardrive = arDriveAnonymousFactory();

		const address = await parameters.getWalletAddress();
		const privateKeyData = await parameters.getPrivateKeyData();

		const drives: Partial<ArFSDriveEntity>[] = await ardrive.getAllDrivesForAddress(address, privateKeyData);

		// TODO: Fix base types so deleting un-used values is not necessary; Tickets: PE-525 + PE-556
		for (const drive of drives) {
			delete drive.syncStatus;
		}

		// Display data
		console.log(JSON.stringify(drives, null, 4));

		return SUCCESS_EXIT_CODE;
	})
});
