import { CLICommand, ParametersHelper } from '../CLICommand';
import {
	BoostParameter,
	DryRunParameter,
	FileIdParameter,
	ParentFolderIdParameter,
	DrivePrivacyParameters
} from '../parameter_declarations';
import { Wallet } from '../wallet';
import { arDriveFactory } from '..';
import { SUCCESS_EXIT_CODE } from '../CLICommand/error_codes';
import { CLIAction } from '../CLICommand/action';
import { EID } from '../types';

new CLICommand({
	name: 'move-file',
	parameters: [FileIdParameter, ParentFolderIdParameter, BoostParameter, DryRunParameter, ...DrivePrivacyParameters],
	action: new CLIAction(async function action(options) {
		const parameters = new ParametersHelper(options);

		const dryRun = !!parameters.getParameterValue(DryRunParameter);
		const fileId = parameters.getRequiredParameterValue(FileIdParameter, EID);
		const parentFolderId = parameters.getRequiredParameterValue(ParentFolderIdParameter, EID);

		const wallet: Wallet = await parameters.getRequiredWallet();
		const ardrive = arDriveFactory({
			wallet: wallet,
			feeMultiple: parameters.getOptionalBoostSetting(),
			dryRun
		});

		const createDriveResult = await (async function () {
			if (await parameters.getIsPrivate()) {
				const driveId = await ardrive.getDriveIdForFolderId(parentFolderId);
				const driveKey = await parameters.getDriveKey({ driveId });

				return ardrive.movePrivateFile(fileId, parentFolderId, driveKey);
			} else {
				return ardrive.movePublicFile(fileId, parentFolderId);
			}
		})();
		console.log(JSON.stringify(createDriveResult, null, 4));

		return SUCCESS_EXIT_CODE;
	})
});
