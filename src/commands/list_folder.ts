import { arDriveAnonymousFactory, arDriveFactory } from '..';
import { ArFSPrivateFileOrFolderWithPaths, ArFSPublicFileOrFolderWithPaths } from '../arfs_entities';
import { CLICommand, ParametersHelper } from '../CLICommand';
import { SUCCES_EXIT_CODE } from '../CLICommand/constants';
import { DrivePrivacyParameters, ParentFolderIdParameter, TreeDepthParams } from '../parameter_declarations';
import { alphabeticalOrder } from '../utils/sort_functions';

new CLICommand({
	name: 'list-folder',
	parameters: [ParentFolderIdParameter, ...TreeDepthParams, ...DrivePrivacyParameters],
	async action(options) {
		const parameters = new ParametersHelper(options);
		const folderId = parameters.getRequiredParameterValue(ParentFolderIdParameter);
		let children: (ArFSPrivateFileOrFolderWithPaths | ArFSPublicFileOrFolderWithPaths)[];
		const maxDepth = await parameters.getMaxDepth(0);

		if (await parameters.getIsPrivate()) {
			const wallet = await parameters.getRequiredWallet();
			const arDrive = arDriveFactory({ wallet });

			const driveId = await arDrive.getDriveIdForFolderId(folderId);
			const driveKey = await parameters.getDriveKey(driveId);

			children = await arDrive.listPrivateFolder(folderId, driveKey, maxDepth);
		} else {
			const arDrive = arDriveAnonymousFactory();
			children = await arDrive.listPublicFolder(folderId, maxDepth);
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
		return SUCCES_EXIT_CODE;
	}
});
