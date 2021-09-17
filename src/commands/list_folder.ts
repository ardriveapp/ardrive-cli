/* eslint-disable no-console */
import { arweave } from '..';
import { ArDrive, ArDriveAnonymous } from '../ardrive';
import { ArFSDAO, ArFSDAOAnonymous } from '../arfsdao';
import { CLICommand } from '../CLICommand';
import { CommonContext } from '../CLICommand/common_context';
import { ParentFolderIdParameter, SeedPhraseParameter, WalletFileParameter } from '../parameter_declarations';

new CLICommand({
	name: 'list-folder',
	parameters: [ParentFolderIdParameter, SeedPhraseParameter, WalletFileParameter],
	async action(options) {
		const context = new CommonContext(options);
		const wallet = await context.getWallet().catch(() => null);
		let folder, childrenTxIds;
		if (wallet) {
			const arDrive = new ArDrive(new ArFSDAO(wallet, arweave));
			folder = await arDrive.getPrivateFolder(options.folderId);
			childrenTxIds = await arDrive.getChildrenTxIds(options.folderId);
		} else {
			const arDrive = new ArDriveAnonymous(new ArFSDAOAnonymous(arweave));
			folder = await arDrive.getPublicFolder(options.folderId);
			childrenTxIds = await arDrive.getChildrenTxIds(options.folderId);
		}
		console.log(JSON.stringify(folder, null, 4));
		console.log(JSON.stringify(childrenTxIds, null, 4));
		process.exit(0);
	}
});
