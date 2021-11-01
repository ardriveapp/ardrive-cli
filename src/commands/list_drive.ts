import { arDriveFactory, cliArweave, cliWalletDao } from '..';
import { ArDriveAnonymous } from '../ardrive';
import { ArFSDAOAnonymous } from '../arfsdao_anonymous';
import { ArFSPrivateFileOrFolderWithPaths, ArFSPublicFileOrFolderWithPaths } from '../arfs_entities';
import { CLICommand, ParametersHelper } from '../CLICommand';
import { SUCCESS_EXIT_CODE } from '../CLICommand/constants';
import { DriveIdParameter, DrivePrivacyParameters, TreeDepthParams } from '../parameter_declarations';
import { EID } from '../types/entity_id';
import { alphabeticalOrder } from '../utils/sort_functions';

new CLICommand({
	name: 'list-drive',
	parameters: [DriveIdParameter, ...TreeDepthParams, ...DrivePrivacyParameters],
	async action(options) {
		const parameters = new ParametersHelper(options, cliWalletDao);
		const driveId = EID(parameters.getRequiredParameterValue(DriveIdParameter));
		let children: (ArFSPrivateFileOrFolderWithPaths | ArFSPublicFileOrFolderWithPaths)[];
		const maxDepth = await parameters.getMaxDepth(Number.MAX_SAFE_INTEGER);

		if (await parameters.getIsPrivate()) {
			const wallet = await parameters.getRequiredWallet();
			const arDrive = arDriveFactory({ wallet });
			const driveKey = await parameters.getDriveKey({ driveId });
			const drive = await arDrive.getPrivateDrive(driveId, driveKey);
			const rootFolderId = drive.rootFolderId;

			// We have the drive id from deriving a key, we can derive the owner
			const driveOwner = await arDrive.getOwnerForDriveId(driveId);

			children = await arDrive.listPrivateFolder({
				folderId: rootFolderId,
				driveKey,
				maxDepth,
				includeRoot: true,
				owner: driveOwner
			});
		} else {
			const arDrive = new ArDriveAnonymous(new ArFSDAOAnonymous(cliArweave));
			const drive = await arDrive.getPublicDrive(driveId);
			const rootFolderId = drive.rootFolderId;
			children = await arDrive.listPublicFolder({ folderId: rootFolderId, maxDepth, includeRoot: true });
		}

		const sortedChildren = children.sort((a, b) => alphabeticalOrder(a.path, b.path)) as (
			| Partial<ArFSPrivateFileOrFolderWithPaths>
			| Partial<ArFSPublicFileOrFolderWithPaths>
		)[];

		// TODO: Fix base types so deleting un-used values is not necessary; Tickets: PE-525 + PE-556
		sortedChildren.map((fileOrFolderMetaData) => {
			if (fileOrFolderMetaData.entityType === 'folder') {
				delete fileOrFolderMetaData.lastModifiedDate;
				delete fileOrFolderMetaData.size;
			}
		});

		// Display data
		console.log(JSON.stringify(sortedChildren, null, 4));
		return SUCCESS_EXIT_CODE;
	}
});
