/* eslint-disable no-console */
import { cliArweave } from '..';
import { cliWalletDao, CLI_APP_NAME, CLI_APP_VERSION } from '..';
import { ArDrive, ArDriveAnonymous } from '../ardrive';
import { ArFSDAO, ArFSDAOAnonymous, ArFSPrivateFileOrFolderData, ArFSPublicFileOrFolderData } from '../arfsdao';
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
		const wallet = await context.getWallet().catch(() => null);
		const password = context.getParameterValue(DrivePasswordParameter);
		const folderId = context.getParameterValue(ParentFolderIdParameter);
		let children: (ArFSPrivateFileOrFolderData | ArFSPublicFileOrFolderData)[];

		if (!folderId) {
			console.log(`Folder id not specified! ${folderId}`);
			process.exit(1);
		}

		if (wallet && password) {
			const arDrive = new ArDrive(
				wallet,
				cliWalletDao,
				new ArFSDAO(wallet, cliArweave),
				new ArDriveCommunityOracle(cliArweave),
				CLI_APP_NAME,
				CLI_APP_VERSION
			);
			const folderBuilder = await arDrive.getPrivateFolderMetaData(folderId);
			if (!folderBuilder.driveId) {
				throw new Error(`Could not get driveId of private folder`);
			}
			const driveKey = await context.getDriveKey(folderBuilder.driveId);
			const folder = await folderBuilder.build(driveKey);
			children = await arDrive.getChildrenOfPrivateFolder(folder, driveKey);
		} else {
			const arDrive = new ArDriveAnonymous(new ArFSDAOAnonymous(cliArweave));
			children = await arDrive.getChildrenOfPublicFolder(folderId);
		}

		// Display data
		console.log(
			JSON.stringify(
				children.sort((a, b) => alphabeticalOrder(a.path, b.path)),
				null,
				4
			)
		);
		process.exit(0);
	}
});
