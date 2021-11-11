import { CLICommand, ParametersHelper } from '../CLICommand';
import { EID } from '../types';
import { DriveIdParameter, GetAllRevisionsParameter, DrivePrivacyParameters } from '../parameter_declarations';
import { arDriveAnonymousFactory, arDriveFactory } from '..';
import { ArFSPrivateDrive, ArFSPublicDrive } from '../arfs_entities';
import { SUCCESS_EXIT_CODE } from '../CLICommand/error_codes';
import { CLIAction } from '../CLICommand/action';

new CLICommand({
	name: 'drive-info',
	parameters: [DriveIdParameter, GetAllRevisionsParameter, ...DrivePrivacyParameters],
	action: new CLIAction(async function action(options) {
		const parameters = new ParametersHelper(options);

		const driveId = EID(parameters.getRequiredParameterValue(DriveIdParameter));

		const result: Partial<ArFSPublicDrive | ArFSPrivateDrive> = await (async function () {
			if (await parameters.getIsPrivate()) {
				const wallet = await parameters.getRequiredWallet();
				const arDrive = arDriveFactory({ wallet: wallet });
				const driveKey = await parameters.getDriveKey({ driveId });

				return arDrive.getPrivateDrive({ driveId, driveKey });
			} else {
				const arDrive = arDriveAnonymousFactory();
				return arDrive.getPublicDrive({ driveId });
			}
		})();

		console.log(JSON.stringify(result, null, 4));
		return SUCCESS_EXIT_CODE;
	})
});
