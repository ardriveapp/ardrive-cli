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
		const wallet = await parameters.getOptionalWallet();
		const driveId: string = options.driveId;
		// const shouldGetAllRevisions: boolean = options.getAllRevisions;

		const result = await (async function () {
			if (wallet) {
				const arDrive = arDriveFactory({ wallet: wallet });
				const driveKey = await parameters.getDriveKey(driveId);

				return arDrive.getPrivateDrive(driveId, driveKey /*, shouldGetAllRevisions*/);
			} else {
				const arDrive = arDriveFactory();
				return arDrive.getPublicDrive(driveId /*, shouldGetAllRevisions*/);
			}
		})();
		console.log(JSON.stringify(result, null, 4));
		process.exit(0);
	}
});
