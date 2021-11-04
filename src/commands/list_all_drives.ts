import { arDriveAnonymousFactory, cliWalletDao } from '..';
import { ArFSDriveEntity } from '../arfs_entities';
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

		// Display data
		console.log(JSON.stringify(drives, null, 4));

		return SUCCESS_EXIT_CODE;
	})
});
