import { CLICommand, ParametersHelper } from '../CLICommand';
import {
	BoostParameter,
	FolderNameParameter,
	DryRunParameter,
	ParentFolderIdParameter,
	DrivePrivacyParameters
} from '../parameter_declarations';
import { cliArDriveFactory } from '..';
import { SUCCESS_EXIT_CODE } from '../CLICommand/error_codes';
import { CLIAction } from '../CLICommand/action';
import { Wallet, EID } from 'ardrive-core-js';

new CLICommand({
	name: 'create-folder',
	parameters: [
		ParentFolderIdParameter,
		FolderNameParameter,
		BoostParameter,
		DryRunParameter,
		...DrivePrivacyParameters
	],
	action: new CLIAction(async function action(options) {
		const parameters = new ParametersHelper(options);
		const wallet: Wallet = await parameters.getRequiredWallet();
		const dryRun = !!parameters.getParameterValue(DryRunParameter);

		const ardrive = cliArDriveFactory({
			wallet,
			feeMultiple: parameters.getOptionalBoostSetting(),
			dryRun
		});

		const parentFolderId = parameters.getRequiredParameterValue(ParentFolderIdParameter, EID);
		const driveId = await ardrive.getDriveIdForFolderId(parentFolderId);
		const folderName = parameters.getRequiredParameterValue(FolderNameParameter);

		const createFolderResult = await (async function () {
			if (await parameters.getIsPrivate()) {
				const driveKey = await parameters.getDriveKey({ driveId });
				return ardrive.createPrivateFolder({
					folderName,
					driveId,
					driveKey,
					parentFolderId
				});
			} else {
				return ardrive.createPublicFolder({ folderName, driveId, parentFolderId });
			}
		})();
		console.log(JSON.stringify(createFolderResult, null, 4));

		return SUCCESS_EXIT_CODE;
	})
});
