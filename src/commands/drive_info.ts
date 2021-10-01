import { CLICommand, ParametersHelper } from '../CLICommand';
import {
	DriveIdParameter,
	DriveKeyParameter,
	DrivePasswordParameter,
	GetAllRevisionsParameter,
	WalletFileParameter
} from '../parameter_declarations';
import { arDriveFactory } from '..';

/* eslint-disable no-console */

new CLICommand({
	name: 'drive-info',
	parameters: [
		DriveIdParameter,
		GetAllRevisionsParameter,
		DrivePasswordParameter,
		DriveKeyParameter,
		WalletFileParameter
	],
	async action(options) {
		const parameters = new ParametersHelper(options);
		const wallet = await parameters.getWallet().catch(() => null);
		const result = await (function () {
			if (wallet) {
				const arDrive = arDriveFactory({
					wallet: wallet
				});
				const driveId: string = options.driveId;
				// const getAllRevisions: boolean = options.getAllRevisions;
				return arDrive.getPrivateDrive(driveId, options.drivePassword /*, getAllRevisions*/);
			} else {
				const arDrive = arDriveFactory();
				const driveId: string = options.driveId;
				// const getAllRevisions: boolean = options.getAllRevisions;
				return arDrive.getPublicDrive(driveId /*, getAllRevisions*/);
			}
		})();
		console.log(JSON.stringify(result, null, 4));
		process.exit(0);
	}
});
