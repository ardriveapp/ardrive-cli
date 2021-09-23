/* eslint-disable no-console */
import { arweave } from '..';
import { ArDrive, ArDriveAnonymous } from '../ardrive';
import { ArFSDAO, ArFSDAOAnonymous, FolderHierarchy } from '../arfsdao';
import { CLICommand } from '../CLICommand';
import { CommonContext } from '../CLICommand/common_context';
import { ParentFolderIdParameter, SeedPhraseParameter, WalletFileParameter } from '../parameter_declarations';

new CLICommand({
	name: 'list-folder',
	parameters: [ParentFolderIdParameter, SeedPhraseParameter, WalletFileParameter],
	async action(options) {
		const context = new CommonContext(options);
		const wallet = await context.getWallet().catch(() => null);
		let folder;

		const arDrive = wallet
			? new ArDrive(new ArFSDAO(wallet, arweave))
			: new ArDriveAnonymous(new ArFSDAOAnonymous(arweave));

		// Fetch the folder to extract the drive
		if (wallet) {
			folder = await (arDrive as ArDrive).getPrivateFolder(options.folderId);
		} else {
			folder = await arDrive.getPublicFolder(options.folderId);
		}

		// Fetch all of the folder entities within the drive
		const driveIdOfFolder = folder.driveId;
		const allFolderEntitiesOfDrive = await arDrive.getAllFoldersOfPublicDrive(driveIdOfFolder);

		// Feed entities to FolderHierarchy.setupNodesWithEntity()
		const hierarchy = FolderHierarchy.newFromEntities(allFolderEntitiesOfDrive);
		const folderIDs = hierarchy.allFolderIDs();

		// Fetch all file entities within all Folders of the drive
		const allFileEntitiesOfDrive = await arDrive.getAllChildrenFilesFromFolderIDs(folderIDs);

		// TODO: show all data

		// console.log(JSON.stringify(folder, null, 4));
		// console.log(JSON.stringify(childrenTxIds, null, 4));
		process.exit(0);
	}
});
