import { ArDriveAnonymous } from '../ardrive';
import { ArFSDAOAnonymous } from '../arfsdao';
import { CLICommand } from '../CLICommand';
import { Context } from '../CLICommand/common_context';
import {
	DriveIdParameter,
	DriveKeyParameter,
	DrivePasswordParameter,
	GetAllRevisionsParameter,
	WalletFileParameter
} from '../parameter_declarations';
import { arDriveFactory, cliArweave, cliWalletDao } from '..';

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
		const context = new Context(options, cliWalletDao);
		const wallet = await context.getWallet().catch(() => null);
		const result = await (function () {
			if (wallet) {
				const arDrive = arDriveFactory({
					wallet: wallet
				});
				const driveId: string = options.driveId;
				// const getAllRevisions: boolean = options.getAllRevisions;
				return arDrive.getPrivateDrive(driveId, options.drivePassword /*, getAllRevisions*/);
			} else {
				const arDrive = new ArDriveAnonymous(new ArFSDAOAnonymous(cliArweave));
				const driveId: string = options.driveId;
				// const getAllRevisions: boolean = options.getAllRevisions;
				return arDrive.getPublicDrive(driveId /*, getAllRevisions*/);
			}
		})();
		console.log(JSON.stringify(result, null, 4));
		process.exit(0);
	}
});
