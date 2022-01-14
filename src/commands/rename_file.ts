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

		const dryRun = !!parameters.getParameterValue(DryRunParameter);
		const fileId = parameters.getRequiredParameterValue(FileIdParameter, EID);
		const newName = parameters.getRequiredParameterValue(FileNameParameter);

		const wallet: Wallet = await parameters.getRequiredWallet();
		const owner = await wallet.getAddress();
		const ardrive = cliArDriveFactory({
			wallet: wallet,
			feeMultiple: parameters.getOptionalBoostSetting(),
			dryRun
		});

		const result = await (async function () {
			if (await parameters.getIsPrivate()) {
				const driveId = await ardrive.getDriveIdForFileId(fileId);
				const driveKey = await parameters.getDriveKey({ driveId });
				const file = await ardrive.getPrivateFile({
					fileId,
					driveKey,
					owner
				});

				return ardrive.renamePrivateFile({
					file,
					newName,
					metaDataRewardSettings: { feeMultiple: parameters.getOptionalBoostSetting() },
					owner,
					driveKey
				});
			} else {
				const file = await ardrive.getPublicFile({ fileId });
				return ardrive.renamePublicFile({
					file,
					newName,
					metaDataRewardSettings: { feeMultiple: parameters.getOptionalBoostSetting() },
					owner
				});
			}
		})();

		console.log(JSON.stringify(result, null, 4));
		return SUCCESS_EXIT_CODE;
	})
});
