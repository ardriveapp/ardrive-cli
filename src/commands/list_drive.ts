import { arDriveFactory, cliArweave, cliWalletDao } from '..';
import { ArDriveAnonymous } from '../ardrive';
import { ArFSDAOAnonymous, ArFSPrivateFileOrFolderWithPaths, ArFSPublicFileOrFolderWithPaths } from '../arfsdao';
import { CLICommand, ParametersHelper } from '../CLICommand';
import { DriveIdParameter, DrivePrivacyParameters, TreeDepthParams } from '../parameter_declarations';
import { alphabeticalOrder } from '../utils/sort_functions';

new CLICommand({
	name: 'list-drive',
	parameters: [DriveIdParameter, ...TreeDepthParams, ...DrivePrivacyParameters],
	async action(options) {
		const parameters = new ParametersHelper(options, cliWalletDao);
		const driveId = parameters.getRequiredParameterValue(DriveIdParameter);
		let children: (ArFSPrivateFileOrFolderWithPaths | ArFSPublicFileOrFolderWithPaths)[];
		const maxDepth = await parameters.getMaxDepth(Number.POSITIVE_INFINITY);

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

		const sortedChildren = children.sort((a, b) => alphabeticalOrder(a.path, b.path)) as (
			| Partial<ArFSPrivateFileOrFolderWithPaths>
			| Partial<ArFSPublicFileOrFolderWithPaths>
		)[];

		// TODO: Fix base types so deleting un-used values is not necessary
		sortedChildren.map((fileOrFolderMetaData) => {
			if (fileOrFolderMetaData.entityType === 'folder') {
				delete fileOrFolderMetaData.lastModifiedDate;
			}
			delete fileOrFolderMetaData.syncStatus;
		});

		// Display data
		console.log(JSON.stringify(sortedChildren, null, 4));
		process.exit(0);
	}
});
