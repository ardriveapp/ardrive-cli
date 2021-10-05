/* eslint-disable no-console */
import { arweave } from 'ardrive-core-js';
import { arDriveFactory, cliWalletDao, CLI_APP_NAME, CLI_APP_VERSION } from '..';
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
		const parameters = new ParametersHelper(options);
		const folderId = parameters.getRequiredParameterValue(ParentFolderIdParameter);
		let children: (ArFSPrivateFileOrFolderWithPaths | ArFSPublicFileOrFolderWithPaths)[];

		if (await parameters.getIsPrivate()) {
			const wallet = await parameters.getRequiredWallet();
			const arDrive = arDriveFactory({ wallet });

			const driveId = await arDrive.getDriveIdForFolderId(folderId);
			const driveKey = await parameters.getDriveKey(driveId);

			children = await arDrive.listPrivateFolder(folderId, driveKey);
		} else {
			const arDrive = arDriveFactory();
			children = await arDrive.listPublicFolder(folderId);
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
