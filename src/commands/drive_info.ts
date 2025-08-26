import { CLICommand, ParametersHelper } from '../CLICommand';
import {
	DriveIdParameter,
	GetAllRevisionsParameter,
	DrivePrivacyParameters,
	GatewayParameter
} from '../parameter_declarations';
import { cliArDriveAnonymousFactory, cliArDriveFactory } from '..';
import { SUCCESS_EXIT_CODE } from '../CLICommand/error_codes';
import { CLIAction } from '../CLICommand/action';
import { EID, ArFSPublicDrive, ArFSPrivateDrive } from 'ardrive-core-js';
import { getArweaveFromURL } from '../utils/get_arweave_for_url';

new CLICommand({
	name: 'drive-info',
	parameters: [DriveIdParameter, GetAllRevisionsParameter, ...DrivePrivacyParameters, GatewayParameter],
	action: new CLIAction(async function action(options) {
		const parameters = new ParametersHelper(options);
		const arweave = getArweaveFromURL(parameters.getGateway());

		const driveId = EID(parameters.getRequiredParameterValue(DriveIdParameter));

		const result: Partial<ArFSPublicDrive | ArFSPrivateDrive> = await (async function () {
			if (await parameters.getIsPrivate()) {
				const wallet = await parameters.getRequiredWallet();
				const arDrive = cliArDriveFactory({ wallet, arweave });
				const driveKey = await parameters.getDriveKey({
					driveId,
					arDrive,
					owner: await wallet.getAllAddresses()
				});

				return arDrive.getPrivateDrive({ driveId, driveKey });
			} else {
				const arDrive = cliArDriveAnonymousFactory({ arweave });
				return arDrive.getPublicDrive({ driveId });
			}
		})();

		console.log(JSON.stringify(result, null, 4));
		return SUCCESS_EXIT_CODE;
	})
});
