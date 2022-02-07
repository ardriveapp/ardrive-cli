import {
	EID,
	ArFSPrivateFileOrFolderWithPaths,
	ArFSPublicFileOrFolderWithPaths,
	ArDriveAnonymous,
	ArFSDAOAnonymous,
	alphabeticalOrder
} from 'ardrive-core-js';
import { cliArDriveFactory, cliArweave, cliWalletDao } from '..';
import { CLICommand, ParametersHelper } from '../CLICommand';
import { CLIAction } from '../CLICommand/action';
import { SUCCESS_EXIT_CODE } from '../CLICommand/error_codes';
import {
	DriveIdParameter,
	DrivePrivacyParameters,
	TreeDepthParams,
	WithKeysParameter
} from '../parameter_declarations';

new CLICommand({
	name: 'list-drive',
	parameters: [DriveIdParameter, WithKeysParameter, ...TreeDepthParams, ...DrivePrivacyParameters],
	action: new CLIAction(async function action(options) {
		const parameters = new ParametersHelper(options, cliWalletDao);
		const driveId = parameters.getRequiredParameterValue(DriveIdParameter, EID);
		let children: (ArFSPrivateFileOrFolderWithPaths | ArFSPublicFileOrFolderWithPaths)[];
		const maxDepth = await parameters.getMaxDepth(Number.MAX_SAFE_INTEGER);

		if (await parameters.getIsPrivate()) {
			const wallet = await parameters.getRequiredWallet();
			const arDrive = cliArDriveFactory({ wallet });
			const driveKey = await parameters.getDriveKey({ driveId });
			const drive = await arDrive.getPrivateDrive({ driveId, driveKey });
			const rootFolderId = drive.rootFolderId;
			const withKeys = await parameters.getParameterValue(WithKeysParameter, (value) => !!value);

			// We have the drive id from deriving a key, we can derive the owner
			const driveOwner = await arDrive.getOwnerForDriveId(driveId);

			children = await arDrive.listPrivateFolder({
				folderId: rootFolderId,
				driveKey,
				maxDepth,
				includeRoot: true,
				owner: driveOwner,
				withKeys
			});
		} else {
			const arDrive = new ArDriveAnonymous(new ArFSDAOAnonymous(cliArweave));
			const drive = await arDrive.getPublicDrive({ driveId });
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
				delete fileOrFolderMetaData.dataTxId;
				delete fileOrFolderMetaData.dataContentType;
			}
		});

		// Display data
		console.log(JSON.stringify(sortedChildren, null, 4));
		return SUCCESS_EXIT_CODE;
	})
});
