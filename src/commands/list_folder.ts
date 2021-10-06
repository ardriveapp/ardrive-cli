/* eslint-disable no-console */
import { arweave } from 'ardrive-core-js';
import { cliWalletDao, CLI_APP_NAME, CLI_APP_VERSION } from '..';
import { ArDrive, ArDriveAnonymous } from '../ardrive';
import {
	ArFSDAO,
	ArFSDAOAnonymous,
	ArFSPrivateFileOrFolderWithPaths,
	ArFSPublicFileOrFolderWithPaths
} from '../arfsdao';
import { CLICommand } from '../CLICommand';
import { CommonContext } from '../CLICommand/common_context';
import { ArDriveCommunityOracle } from '../community/ardrive_community_oracle';
import {
	DrivePasswordParameter,
	ParentFolderIdParameter,
	SeedPhraseParameter,
	WalletFileParameter
} from '../parameter_declarations';

function alphabeticalOrder(a: string, b: string) {
	return a.localeCompare(b);
}

new CLICommand({
	name: 'list-folder',
	parameters: [ParentFolderIdParameter, SeedPhraseParameter, WalletFileParameter, DrivePasswordParameter],
	async action(options) {
		const context = new CommonContext(options, cliWalletDao);
		const folderId = context.getParameterValue(ParentFolderIdParameter);
		let children: (ArFSPrivateFileOrFolderWithPaths | ArFSPublicFileOrFolderWithPaths)[];

		if (!folderId) {
			console.log(`Folder id not specified!`);
			process.exit(1);
		}

		if (await context.getIsPrivate()) {
			const wallet = await context.getWallet();
			const arDrive = new ArDrive(
				wallet,
				cliWalletDao,
				new ArFSDAO(wallet, arweave),
				new ArDriveCommunityOracle(arweave),
				CLI_APP_NAME,
				CLI_APP_VERSION
			);
			const driveId = await arDrive.getDriveIdForFolderId(folderId);
			const driveKey = await context.getDriveKey(driveId);

			children = await arDrive.listPrivateFolder(folderId, driveKey);
		} else {
			const arDrive = new ArDriveAnonymous(new ArFSDAOAnonymous(arweave));
			children = await arDrive.listPublicFolder(folderId);
		}

		const sortedChildren = children.sort((a, b) => alphabeticalOrder(a.path, b.path)) as (
			| Partial<ArFSPrivateFileOrFolderWithPaths>
			| Partial<ArFSPublicFileOrFolderWithPaths>
		)[];

		// TODO: Fix base types so deleting un-used values is not necessary
		sortedChildren.map((fileOrFolderMetaData) => {
			delete fileOrFolderMetaData.lastModifiedDate;
			delete fileOrFolderMetaData.syncStatus;
		});

		// Display data
		console.log(JSON.stringify(sortedChildren, null, 4));
		process.exit(0);
	}
});
