import { arDriveFactory, cliArweave, cliWalletDao } from '..';
import { ArDriveAnonymous } from '../ardrive';
import { ArFSDAOAnonymous } from '../arfsdao_anonymous';
import { ArFSPrivateFileOrFolderWithPaths, ArFSPublicFileOrFolderWithPaths } from '../arfs_entities';
import { ArFSManifestToUpload } from '../arfs_file_wrapper';
import { CLICommand, ParametersHelper } from '../CLICommand';
import { SUCCESS_EXIT_CODE } from '../CLICommand/constants';
import {
	BoostParameter,
	DestinationFileNameParameter,
	DriveIdParameter,
	DrivePrivacyParameters,
	DryRunParameter,
	TreeDepthParams
} from '../parameter_declarations';
import { FeeMultiple, Manifest, ManifestPathMap } from '../types';
import { alphabeticalOrder } from '../utils/sort_functions';

new CLICommand({
	name: 'create-manifest',
	parameters: [
		DriveIdParameter,
		DestinationFileNameParameter,
		BoostParameter,
		DryRunParameter,
		...TreeDepthParams,
		...DrivePrivacyParameters
	],
	async action(options) {
		if (!options.destFileName) {
			options.destFileName = 'ArDrive Manifest.json';
		}
		const parameters = new ParametersHelper(options, cliWalletDao);

		let rootFolderId: string;

		const wallet = await parameters.getRequiredWallet();

		const arDrive = arDriveFactory({
			wallet: wallet,
			feeMultiple: options.boost as FeeMultiple,
			dryRun: options.dryRun
		});

		const driveId = parameters.getRequiredParameterValue(DriveIdParameter);
		let children: (ArFSPrivateFileOrFolderWithPaths | ArFSPublicFileOrFolderWithPaths)[];
		const maxDepth = await parameters.getMaxDepth(Number.MAX_SAFE_INTEGER);

		if (await parameters.getIsPrivate()) {
			const wallet = await parameters.getRequiredWallet();
			const arDrive = arDriveFactory({ wallet });
			const driveKey = await parameters.getDriveKey({ driveId });
			const drive = await arDrive.getPrivateDrive(driveId, driveKey);
			rootFolderId = drive.rootFolderId;

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
			rootFolderId = drive.rootFolderId;
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
			delete fileOrFolderMetaData.syncStatus;
		});

		// TURN SORTED CHILDREN INTO MANIFEST
		// These interfaces taken from arweave-deploy

		const indexPath = 'index.html';
		const pathMap: ManifestPathMap = {};
		sortedChildren.forEach((child) => {
			if (child.dataTxId && child.path) {
				pathMap[child.path] = { id: child.dataTxId };
			}
		});

		const arweaveManifest: Manifest = {
			manifest: 'arweave/paths',
			version: '0.1.0',
			index: {
				path: indexPath
			},
			paths: pathMap
		};

		// Display manifest
		// console.log(JSON.stringify(arweaveManifest, null, 4));
		// console.log(JSON.stringify(sortedChildren, null, 4));

		const result = await (async () => {
			if (await parameters.getIsPrivate()) {
				// const driveKey = await parameters.getDriveKey({ driveId });
				// return arDrive.uploadPrivateFile(rootFolderId, manifestEntity, driveKey, options.destFileName);
				throw new Error('implement me');
			} else {
				return arDrive.uploadPublicManifest(
					rootFolderId,
					new ArFSManifestToUpload(arweaveManifest),
					options.destFileName
				);
			}
		})();
		console.log(JSON.stringify({ manifest: arweaveManifest, ...result }, null, 4));

		return SUCCESS_EXIT_CODE;
	}
});
