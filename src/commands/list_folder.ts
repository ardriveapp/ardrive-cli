import {
	EID,
	ArFSPrivateFileOrFolderWithPaths,
	ArFSPublicFileOrFolderWithPaths,
	alphabeticalOrder
} from 'ardrive-core-js';
import { cliArDriveAnonymousFactory, cliArDriveFactory } from '..';
import { CLICommand, ParametersHelper } from '../CLICommand';
import { CLIAction } from '../CLICommand/action';
import { SUCCESS_EXIT_CODE } from '../CLICommand/error_codes';
import {
	DrivePrivacyParameters,
	ParentFolderIdParameter,
	TreeDepthParams,
	WithKeysParameter
} from '../parameter_declarations';

new CLICommand({
	name: 'list-folder',
	parameters: [ParentFolderIdParameter, WithKeysParameter, ...TreeDepthParams, ...DrivePrivacyParameters],
	action: new CLIAction(async function action(options) {
		const parameters = new ParametersHelper(options);
		const folderId = parameters.getRequiredParameterValue(ParentFolderIdParameter, EID);
		let children: (ArFSPrivateFileOrFolderWithPaths | ArFSPublicFileOrFolderWithPaths)[];
		const maxDepth = await parameters.getMaxDepth(0);

		if (await parameters.getIsPrivate()) {
			const wallet = await parameters.getRequiredWallet();
			const arDrive = cliArDriveFactory({ wallet });

			const driveId = await arDrive.getDriveIdForFolderId(folderId);
			const driveKey = await parameters.getDriveKey({ driveId });
			const withKeys = await parameters.getParameterValue(WithKeysParameter, (value) => !!value);

			// We have the drive id from deriving a key, we can derive the owner
			const driveOwner = await arDrive.getOwnerForDriveId(driveId);

			children = await arDrive.listPrivateFolder({ folderId, driveKey, maxDepth, owner: driveOwner, withKeys });
		} else {
			const arDrive = cliArDriveAnonymousFactory({});
			children = await arDrive.listPublicFolder({ folderId, maxDepth });
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
				delete fileOrFolderMetaData.dataTxId;
				delete fileOrFolderMetaData.dataContentType;
			}
		});

		// Display data
		console.log(JSON.stringify(sortedChildren, null, 4));
		return SUCCESS_EXIT_CODE;
	})
});
