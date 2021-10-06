/* eslint-disable no-console */
import { arDriveFactory, cliArweave, cliWalletDao } from '..';
import { ArDriveAnonymous } from '../ardrive';
import { ArFSDAOAnonymous, ArFSPrivateFileOrFolderWithPaths, ArFSPublicFileOrFolderWithPaths } from '../arfsdao';
import { CLICommand, ParametersHelper } from '../CLICommand';
import { DriveIdParameter, DrivePrivacyParameters } from '../parameter_declarations';
import { alphabeticalOrder } from '../utils/sort_functions';

new CLICommand({
	name: 'list-drive',
	parameters: [DriveIdParameter, ...DrivePrivacyParameters],
	async action(options) {
		const parameters = new ParametersHelper(options, cliWalletDao);
		const driveId = parameters.getRequiredParameterValue(DriveIdParameter);
		let children: (ArFSPrivateFileOrFolderWithPaths | ArFSPublicFileOrFolderWithPaths)[];
		const maxDepth = Number.MAX_SAFE_INTEGER;

		if (await parameters.getIsPrivate()) {
			const wallet = await parameters.getRequiredWallet();
			const arDrive = arDriveFactory({ wallet });
			const driveKey = await parameters.getDriveKey(driveId);
			const drive = await arDrive.getPrivateDrive(driveId, driveKey);
			const rootFolderId = drive.rootFolderId;
			children = await arDrive.listPrivateFolder(rootFolderId, driveKey, maxDepth, true);
		} else {
			const arDrive = new ArDriveAnonymous(new ArFSDAOAnonymous(cliArweave));
			const drive = await arDrive.getPublicDrive(driveId);
			const rootFolderId = drive.rootFolderId;
			children = await arDrive.listPublicFolder(rootFolderId, maxDepth, true);
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
