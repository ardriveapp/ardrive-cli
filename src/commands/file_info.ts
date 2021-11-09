import { CLICommand, ParametersHelper } from '../CLICommand';
import { GetAllRevisionsParameter, FileIdParameter, DrivePrivacyParameters } from '../parameter_declarations';
import { arDriveAnonymousFactory, arDriveFactory, cliWalletDao } from '..';
import { FileID, EID } from '../types';
import { ArFSPrivateFile, ArFSPublicFile } from '../arfs_entities';
import { SUCCESS_EXIT_CODE } from '../CLICommand/error_codes';
import { CLIAction } from '../CLICommand/action';

new CLICommand({
	name: 'file-info',
	parameters: [FileIdParameter, GetAllRevisionsParameter, ...DrivePrivacyParameters],
	action: new CLIAction(async function action(options) {
		const parameters = new ParametersHelper(options, cliWalletDao);
		const fileId: FileID = EID(parameters.getRequiredParameterValue(FileIdParameter));
		// const shouldGetAllRevisions: boolean = options.getAllRevisions;

		const result: Partial<ArFSPublicFile | ArFSPrivateFile> = await (async function () {
			if (await parameters.getIsPrivate()) {
				const wallet = await parameters.getRequiredWallet();
				const arDrive = arDriveFactory({ wallet: wallet });
				const driveId = await arDrive.getDriveIdForFileId({ fileId });

				const driveKey = await parameters.getDriveKey({ driveId });

				// We have the drive id from deriving a key, we can derive the owner
				const driveOwner = await arDrive.getOwnerForDriveId({ driveId });

				return arDrive.getPrivateFile({ fileId, driveKey, owner: driveOwner } /*, shouldGetAllRevisions*/);
			} else {
				const arDrive = arDriveAnonymousFactory();
				return arDrive.getPublicFile({ fileId } /*, shouldGetAllRevisions*/);
			}
		})();

		console.log(JSON.stringify(result, null, 4));
		return SUCCESS_EXIT_CODE;
	})
});
