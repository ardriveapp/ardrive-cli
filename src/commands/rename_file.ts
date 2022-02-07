import { CLICommand, ParametersHelper } from '../CLICommand';
import {
	BoostParameter,
	DryRunParameter,
	FileIdParameter,
	DrivePrivacyParameters,
	FileNameParameter
} from '../parameter_declarations';
import { cliArDriveFactory } from '..';
import { SUCCESS_EXIT_CODE } from '../CLICommand/error_codes';
import { CLIAction } from '../CLICommand/action';
import { EID, Wallet } from 'ardrive-core-js';

new CLICommand({
	name: 'rename-file',
	parameters: [FileIdParameter, FileNameParameter, BoostParameter, DryRunParameter, ...DrivePrivacyParameters],
	action: new CLIAction(async function action(options) {
		const parameters = new ParametersHelper(options);

		const dryRun = parameters.isDryRun();
		const fileId = parameters.getRequiredParameterValue(FileIdParameter, EID);
		const newName = parameters.getRequiredParameterValue(FileNameParameter);

		const wallet: Wallet = await parameters.getRequiredWallet();
		const ardrive = cliArDriveFactory({
			wallet: wallet,
			feeMultiple: parameters.getOptionalBoostSetting(),
			dryRun
		});

		const result = await (async function () {
			if (await parameters.getIsPrivate()) {
				const driveId = await ardrive.getDriveIdForFileId(fileId);
				const driveKey = await parameters.getDriveKey({ driveId });

				return ardrive.renamePrivateFile({
					fileId,
					newName,
					driveKey
				});
			} else {
				return ardrive.renamePublicFile({
					fileId,
					newName
				});
			}
		})();

		console.log(JSON.stringify(result, null, 4));
		return SUCCESS_EXIT_CODE;
	})
});
