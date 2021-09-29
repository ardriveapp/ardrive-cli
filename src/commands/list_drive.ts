/* eslint-disable no-console */
import { cliArweave, cliWalletDao, CLI_APP_NAME, CLI_APP_VERSION } from '..';
import { ArDrive, ArDriveAnonymous } from '../ardrive';
import { ArFSDAO, ArFSDAOAnonymous, ArFSPrivateFileOrFolderData, ArFSPublicFileOrFolderData } from '../arfsdao';
import { CLICommand } from '../CLICommand';
import { CommonContext } from '../CLICommand/common_context';
import { ArDriveCommunityOracle } from '../community/ardrive_community_oracle';
import {
	DriveIdParameter,
	DrivePasswordParameter,
	SeedPhraseParameter,
	WalletFileParameter
} from '../parameter_declarations';
import { alphabeticalOrder } from '../utils/sort_functions';

new CLICommand({
	name: 'list-drive',
	parameters: [DriveIdParameter, SeedPhraseParameter, WalletFileParameter],
	async action(options) {
		const context = new CommonContext(options, cliWalletDao);
		const wallet = await context.getWallet().catch(() => null);
		const password = context.getParameterValue(DrivePasswordParameter);
		const driveId = context.getParameterValue(DriveIdParameter);
		let children: (ArFSPrivateFileOrFolderData | ArFSPublicFileOrFolderData)[];

		if (!driveId) {
			console.log(`Drive id not specified!`);
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
			const drive = await arDrive.getPrivateDrive(driveId, password);
			const rootFolderId = drive.rootFolderId;
			children = await arDrive.getChildrenOfPrivateFolder(rootFolderId, password);
		} else {
			const arDrive = new ArDriveAnonymous(new ArFSDAOAnonymous(cliArweave));
			const drive = await arDrive.getPublicDrive(driveId);
			const rootFolderId = drive.rootFolderId;
			children = await arDrive.getChildrenOfPublicFolder(rootFolderId);
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
