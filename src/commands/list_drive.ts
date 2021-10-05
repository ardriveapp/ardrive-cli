/* eslint-disable no-console */
import { cliArweave, cliWalletDao, CLI_APP_NAME, CLI_APP_VERSION } from '..';
import { ArDrive, ArDriveAnonymous } from '../ardrive';
import {
	ArFSDAO,
	ArFSDAOAnonymous,
	ArFSPrivateFileOrFolderWithPaths,
	ArFSPublicFileOrFolderWithPaths
} from '../arfsdao';
import { CLICommand, ParametersHelper } from '../CLICommand';
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
		const parameters = new ParametersHelper(options, cliWalletDao);
		const wallet = await parameters.getRequiredWallet().catch(() => null);
		const password = parameters.getParameterValue(DrivePasswordParameter);
		const driveId = parameters.getParameterValue(DriveIdParameter);
		let children: (ArFSPrivateFileOrFolderWithPaths | ArFSPublicFileOrFolderWithPaths)[];

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
			const driveKey = await parameters.getDriveKey(driveId);
			const drive = await arDrive.getPrivateDrive(driveId, driveKey);
			const rootFolderId = drive.rootFolderId;
			children = await arDrive.listPrivateFolder(rootFolderId, driveKey);
		} else {
			const arDrive = new ArDriveAnonymous(new ArFSDAOAnonymous(cliArweave));
			const drive = await arDrive.getPublicDrive(driveId);
			const rootFolderId = drive.rootFolderId;
			children = await arDrive.listPublicFolder(rootFolderId);
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
