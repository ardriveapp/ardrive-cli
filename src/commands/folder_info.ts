import { CLICommand, ParametersHelper } from '../CLICommand';
import { EID } from '../types';
import { GetAllRevisionsParameter, FolderIdParameter, DrivePrivacyParameters } from '../parameter_declarations';
import { arDriveAnonymousFactory, arDriveFactory } from '..';
import { ArFSPrivateFolder, ArFSPublicFolder } from '../arfs_entities';
import { SUCCESS_EXIT_CODE } from '../CLICommand/error_codes';
import { CLIAction } from '../CLICommand/action';

new CLICommand({
	name: 'folder-info',
	parameters: [FolderIdParameter, GetAllRevisionsParameter, ...DrivePrivacyParameters],
	action: new CLIAction(async function action(options) {
		const parameters = new ParametersHelper(options);
		// const shouldGetAllRevisions: boolean = options.getAllRevisions;

		const result: Partial<ArFSPublicFolder | ArFSPrivateFolder> = await (async function () {
			const folderId = EID(parameters.getRequiredParameterValue(FolderIdParameter));

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
				return arDrive.getPublicFolder(folderId /*, shouldGetAllRevisions*/);
			}
		})();

		// TODO: Fix base types so deleting un-used values is not necessary; Tickets: PE-525 + PE-556
		delete result.lastModifiedDate;

		console.log(JSON.stringify(result, null, 4));
		return SUCCESS_EXIT_CODE;
	})
});
