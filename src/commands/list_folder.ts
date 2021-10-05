/* eslint-disable no-console */
import { arDriveFactory } from '..';
import { ArFSPrivateFileOrFolderWithPaths, ArFSPublicFileOrFolderWithPaths } from '../arfsdao';
import { CLICommand, ParametersHelper } from '../CLICommand';
import {
	DrivePasswordParameter,
	ParentFolderIdParameter,
	SeedPhraseParameter,
	WalletFileParameter
} from '../parameter_declarations';
import { alphabeticalOrder } from '../utils/sort_functions';

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
