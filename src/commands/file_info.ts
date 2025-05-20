import { CLICommand, ParametersHelper } from '../CLICommand';
import {
	GetAllRevisionsParameter,
	FileIdParameter,
	DrivePrivacyParameters,
	GatewayParameter
} from '../parameter_declarations';
import { cliArDriveAnonymousFactory, cliArDriveFactory, cliWalletDao } from '..';
import { SUCCESS_EXIT_CODE } from '../CLICommand/error_codes';
import { CLIAction } from '../CLICommand/action';
import { FileID, EID, ArFSPublicFile, ArFSPrivateFile } from 'ardrive-core-js';
import { getArweaveFromURL } from '../utils/get_arweave_for_url';

new CLICommand({
	name: 'file-info',
	parameters: [FileIdParameter, GetAllRevisionsParameter, ...DrivePrivacyParameters, GatewayParameter],
	action: new CLIAction(async function action(options) {
		const parameters = new ParametersHelper(options, cliWalletDao);
		const fileId: FileID = EID(parameters.getRequiredParameterValue(FileIdParameter));
		const arweave = getArweaveFromURL(parameters.getGateway());

		const result: Partial<ArFSPublicFile | ArFSPrivateFile> = await (async function () {
			if (await parameters.getIsPrivate()) {
				const wallet = await parameters.getRequiredWallet();
				const arDrive = cliArDriveFactory({ wallet, arweave });
				const driveId = await arDrive.getDriveIdForFileId(fileId);

				const driveSignatureInfo = await arDrive.getDriveSignatureInfo(driveId, await wallet.getAddress());
				const driveKey = await parameters.getDriveKey({ driveId, driveSignatureInfo });

				// We have the drive id from deriving a key, we can derive the owner
				const driveOwner = await arDrive.getOwnerForDriveId(driveId);

				return arDrive.getPrivateFile({ fileId, driveKey, owner: driveOwner });
			} else {
				const arDrive = cliArDriveAnonymousFactory({ arweave });
				return arDrive.getPublicFile({ fileId });
			}
		})();

		console.log(JSON.stringify(result, null, 4));
		return SUCCESS_EXIT_CODE;
	})
});
