import { arDriveFactory, cliWalletDao } from '..';
import { ArFSPrivateFileOrFolderWithPaths, ArFSPublicFileOrFolderWithPaths } from '../arfs_entities';
import { ArFSManifestToUpload } from '../arfs_file_wrapper';
import { CLICommand, ParametersHelper } from '../CLICommand';
import { SUCCESS_EXIT_CODE } from '../CLICommand/constants';
import {
	BoostParameter,
	DestinationFileNameParameter,
	DriveIdParameter,
	DryRunParameter,
	SeedPhraseParameter,
	TreeDepthParams,
	WalletFileParameter
} from '../parameter_declarations';
import { FeeMultiple, Manifest, ManifestPathMap, MANIFEST_CONTENT_TYPE } from '../types';
import { alphabeticalOrder } from '../utils/sort_functions';

new CLICommand({
	name: 'create-manifest',
	parameters: [
		DriveIdParameter,
		DestinationFileNameParameter,
		BoostParameter,
		DryRunParameter,
		WalletFileParameter,
		SeedPhraseParameter,
		...TreeDepthParams
	],
	async action(options) {
		if (!options.destFileName) {
			options.destFileName = 'ArDrive Manifest.json';
		}
		const parameters = new ParametersHelper(options, cliWalletDao);

		const wallet = await parameters.getRequiredWallet();

		const arDrive = arDriveFactory({
			wallet: wallet,
			feeMultiple: options.boost as FeeMultiple,
			dryRun: options.dryRun
		});

		const driveId = parameters.getRequiredParameterValue(DriveIdParameter);
		const maxDepth = await parameters.getMaxDepth(Number.MAX_SAFE_INTEGER);

		const drive = await arDrive.getPublicDrive(driveId);
		const rootFolderId = drive.rootFolderId;
		const driveName = drive.name;

		const children = await arDrive.listPublicFolder({ folderId: rootFolderId, maxDepth, includeRoot: true });

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

		const pathMap: ManifestPathMap = {};
		sortedChildren.forEach((child) => {
			if (child.dataTxId && child.path && child.dataContentType !== MANIFEST_CONTENT_TYPE) {
				pathMap[child.path.slice(1)] = { id: child.dataTxId };
			}
		});

		// Use index.html in root folder if it exists, otherwise show first file found
		const indexPath = Object.keys(pathMap).includes(`${driveName}/index.html`)
			? `${driveName}/index.html`
			: Object.keys(pathMap)[0];

		const arweaveManifest: Manifest = {
			manifest: 'arweave/paths',
			version: '0.1.0',
			index: {
				path: indexPath
			},
			paths: pathMap
		};

		// TODO: Private manifests 🤔
		const result = await arDrive.uploadPublicManifest(
			rootFolderId,
			new ArFSManifestToUpload(arweaveManifest),
			options.destFileName
		);

		const allLinks = Object.keys(arweaveManifest.paths).map(
			(path) => `arweave.net/${result.created[0].dataTxId}/${path}`
		);

		console.log(JSON.stringify({ manifest: arweaveManifest, ...result, links: allLinks }, null, 4));

		return SUCCESS_EXIT_CODE;
	}
});
