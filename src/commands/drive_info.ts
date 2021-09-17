import { ArDriveAnonymous } from '../ardrive';
import { ArFSDAOAnonymous } from '../arfsdao';
import { CLICommand } from '../CLICommand';
import { CommonContext } from '../CLICommand/common_context';
import {
	DriveIdParameter,
	DriveKeyParameter,
	DrivePasswordParameter,
	GetAllRevisionsParameter,
	WalletFileParameter
} from '../parameter_declarations';
import { arDriveFactory, arweave } from '..';

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
		const context = new CommonContext(options);
		const wallet = await context.getWallet().catch(() => null);
		const result = await (function () {
			if (wallet) {
				const arDrive = arDriveFactory(wallet);
				const driveId: string = options.driveId;
				// const getAllRevisions: boolean = options.getAllRevisions;
				return arDrive.getPrivateDrive(driveId /*, getAllRevisions*/);
			} else {
				const arDrive = new ArDriveAnonymous(new ArFSDAOAnonymous(arweave));
				const driveId: string = options.driveId;
				// const getAllRevisions: boolean = options.getAllRevisions;
				return arDrive.getPublicDrive(driveId /*, getAllRevisions*/);
			}
		})();
		console.log(JSON.stringify(result, null, 4));
		process.exit(0);
	}
});
