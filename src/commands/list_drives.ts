import { arDriveAnonymousFactory, cliWalletDao } from '..';
import { CLICommand, ParametersHelper } from '../CLICommand';
import { SUCCESS_EXIT_CODE } from '../CLICommand/constants';
import { AddressParameter, DrivePrivacyParameters } from '../parameter_declarations';
import { DriveKey } from '../types';

new CLICommand({
	name: 'list-drives',
	parameters: [AddressParameter, ...DrivePrivacyParameters],
	async action(options) {
		const parameters = new ParametersHelper(options, cliWalletDao);
		const ardrive = arDriveAnonymousFactory();

		const address = await parameters.getWalletAddress();

		let driveKey: DriveKey | undefined = undefined;

		try {
			const latestDriveId = await ardrive.getLatestDriveIdForAddress(address);
			driveKey = await parameters.getDriveKey({ driveId: latestDriveId });
		} catch {
			// Gracefully gather driveKey, do nothing with error
		}

		const drives = await ardrive.getAllDrivesForAddress(address, driveKey);

		// Display data
		console.log(JSON.stringify(drives, null, 4));

		return SUCCESS_EXIT_CODE;
	}
});
