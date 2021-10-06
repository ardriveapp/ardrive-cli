import { ArDriveAnonymous } from '../ardrive';
import { ArFSDAOAnonymous, ArFSPrivateFile, ArFSPublicFile } from '../arfsdao';
import { CLICommand } from '../CLICommand';
import { CommonContext } from '../CLICommand/common_context';
import {
	DriveKeyParameter,
	DrivePasswordParameter,
	GetAllRevisionsParameter,
	FileIdParameter,
	WalletFileParameter
} from '../parameter_declarations';
import { arDriveFactory, cliArweave, cliWalletDao } from '..';

/* eslint-disable no-console */

new CLICommand({
	name: 'file-info',
	parameters: [
		FileIdParameter,
		GetAllRevisionsParameter,
		DrivePasswordParameter,
		DriveKeyParameter,
		WalletFileParameter
	],
	async action(options) {
		const context = new CommonContext(options, cliWalletDao);
		const wallet = await context.getWallet().catch(() => null);

		const result: Partial<ArFSPublicFile | ArFSPrivateFile> = await (function () {
			if (wallet) {
				const arDrive = arDriveFactory({ wallet: wallet });
				const fileId: string = options.fileId;
				// const getAllRevisions: boolean = options.getAllRevisions;
				return arDrive.getPrivateFile(fileId, options.drivePassword /*, getAllRevisions*/);
			} else {
				const arDrive = new ArDriveAnonymous(new ArFSDAOAnonymous(cliArweave));
				const fileId: string = options.fileId;
				// const getAllRevisions: boolean = options.getAllRevisions;
				return arDrive.getPublicFile(fileId /*, getAllRevisions*/);
			}
		})();

		// TODO: Fix base types so deleting un-used values is not necessary
		delete result.syncStatus;

		console.log(JSON.stringify(result, null, 4));
		process.exit(0);
	}
});
