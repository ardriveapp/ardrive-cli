import { ArDriveAnonymous } from '../ardrive';
import { ArFSDAOAnonymous } from '../arfsdao';
import { CLICommand } from '../CLICommand';
import { CommonContext } from '../CLICommand/common_context';
import {
	DriveKeyParameter,
	DrivePasswordParameter,
	GetAllRevisionsParameter,
	FolderIdParameter,
	WalletFileParameter
} from '../parameter_declarations';
import { arDriveFactory, cliArweave, cliWalletDao } from '..';

/* eslint-disable no-console */

new CLICommand({
	name: 'folder-info',
	parameters: [
		FolderIdParameter,
		GetAllRevisionsParameter,
		DrivePasswordParameter,
		DriveKeyParameter,
		WalletFileParameter
	],
	async action(options) {
		const context = new CommonContext(options, cliWalletDao);
		const wallet = await context.getWallet().catch(() => null);
		const result = await (async function () {
			if (wallet) {
				const arDrive = arDriveFactory({ wallet: wallet });
				const folderId: string = options.folderId;

				const driveId = await arDrive.getDriveIdForFolderId(folderId);
				const driveKey = await context.getDriveKey(driveId);

				// const getAllRevisions: boolean = options.getAllRevisions;
				return arDrive.getPrivateFolder(folderId, driveKey /*, getAllRevisions*/);
			} else {
				const arDrive = new ArDriveAnonymous(new ArFSDAOAnonymous(cliArweave));
				const folderId: string = options.folderId;
				// const getAllRevisions: boolean = options.getAllRevisions;
				return arDrive.getPublicFolder(folderId /*, getAllRevisions*/);
			}
		})();
		console.log(JSON.stringify(result, null, 4));
		process.exit(0);
	}
});
