import { CLICommand, ParametersHelper } from '../CLICommand';
import { FolderID } from '../types';
import { GetAllRevisionsParameter, FolderIdParameter, DrivePrivacyParameters } from '../parameter_declarations';
import { arDriveAnonymousFactory, arDriveFactory } from '..';
import { ArFSPrivateFolder, ArFSPublicFolder } from '../arfs_entities';
import { SUCCESS_EXIT_CODE } from '../CLICommand/constants';

new CLICommand({
	name: 'folder-info',
	parameters: [FolderIdParameter, GetAllRevisionsParameter, ...DrivePrivacyParameters],
	async action(options) {
		const parameters = new ParametersHelper(options);
		// const shouldGetAllRevisions: boolean = options.getAllRevisions;

		const result: Partial<ArFSPublicFolder | ArFSPrivateFolder> = await (async function () {
			const folderId: FolderID = parameters.getRequiredParameterValue(FolderIdParameter);

			if (await parameters.getIsPrivate()) {
				const wallet = await parameters.getRequiredWallet();
				const arDrive = arDriveFactory({ wallet: wallet });

				const driveId = await arDrive.getDriveIdForFolderId(folderId);
				const driveKey = await parameters.getDriveKey({ driveId });

				// We have the drive id from deriving a key, we can derive the owner
				const driveOwner = await arDrive.getOwnerForDriveId(driveId);

				return arDrive.getPrivateFolder(folderId, driveKey, driveOwner /*, shouldGetAllRevisions*/);
			} else {
				const arDrive = arDriveAnonymousFactory();
				const folderId: string = options.folderId;
				return arDrive.getPublicFolder(folderId /*, shouldGetAllRevisions*/);
			}
		})();

		// TODO: Fix base types so deleting un-used values is not necessary; Tickets: PE-525 + PE-556
		delete result.size;
		delete result.dataTxId;
		delete result.dataContentType;
		delete result.lastModifiedDate;
		delete result.syncStatus;

		console.log(JSON.stringify(result, null, 4));
		return SUCCESS_EXIT_CODE;
	}
});
