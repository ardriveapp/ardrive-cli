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
		const result = await (function () {
			const driveId: string = options.driveId;
			// const shouldGetAllRevisions: boolean = options.getAllRevisions;
			if (wallet) {
				const arDrive = arDriveFactory({ wallet: wallet });
				return arDrive.getPrivateDrive(driveId, options.drivePassword /*, shouldGetAllRevisions*/);
			} else {
				const arDrive = arDriveFactory();
				return arDrive.getPublicDrive(driveId /*, shouldGetAllRevisions*/);
			}
		})();
		console.log(JSON.stringify(result, null, 4));
		process.exit(0);
	}
});
