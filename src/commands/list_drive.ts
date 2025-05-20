import {
	EID,
	alphabeticalOrder,
	ArFSPrivateFileWithPaths,
	ArFSPrivateFolderWithPaths,
	ArFSPublicFolderWithPaths,
	ArFSPublicFileWithPaths
} from 'ardrive-core-js';
import { cliArDriveAnonymousFactory, cliArDriveFactory, cliWalletDao } from '..';
import { CLICommand, ParametersHelper } from '../CLICommand';
import { CLIAction } from '../CLICommand/action';
import { SUCCESS_EXIT_CODE } from '../CLICommand/error_codes';
import {
	DriveIdParameter,
	DrivePrivacyParameters,
	GatewayParameter,
	TreeDepthParams,
	WithKeysParameter
} from '../parameter_declarations';
import { getArweaveFromURL } from '../utils/get_arweave_for_url';

new CLICommand({
	name: 'list-drive',
	parameters: [DriveIdParameter, WithKeysParameter, ...TreeDepthParams, ...DrivePrivacyParameters, GatewayParameter],
	action: new CLIAction(async function action(options) {
		const parameters = new ParametersHelper(options, cliWalletDao);
		const driveId = parameters.getRequiredParameterValue(DriveIdParameter, EID);
		let children: (
			| ArFSPrivateFolderWithPaths
			| ArFSPrivateFileWithPaths
			| ArFSPublicFolderWithPaths
			| ArFSPublicFileWithPaths
		)[];
		const maxDepth = await parameters.getMaxDepth(Number.MAX_SAFE_INTEGER);
		const arweave = getArweaveFromURL(parameters.getGateway());

		if (await parameters.getIsPrivate()) {
			const wallet = await parameters.getRequiredWallet();
			const arDrive = cliArDriveFactory({ wallet, arweave });
			const driveSignatureInfo = await arDrive.getDriveSignatureInfo(driveId, await wallet.getAddress());
			const driveKey = await parameters.getDriveKey({ driveId, driveSignatureInfo });

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
			const arDrive = cliArDriveAnonymousFactory({ arweave });
			const drive = await arDrive.getPublicDrive({ driveId });
			const rootFolderId = drive.rootFolderId;
			children = await arDrive.listPublicFolder({ folderId: rootFolderId, maxDepth, includeRoot: true });
		}

		const sortedChildren = children.sort((a, b) => alphabeticalOrder(a.path, b.path)) as (
			| Partial<ArFSPrivateFolderWithPaths>
			| Partial<ArFSPrivateFileWithPaths>
			| Partial<ArFSPublicFolderWithPaths>
			| Partial<ArFSPublicFileWithPaths>
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
