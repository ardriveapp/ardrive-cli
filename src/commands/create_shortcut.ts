import { CLICommand, ParametersHelper } from '../CLICommand';
import {
	BoostParameter,
	DryRunParameter,
	FileIdParameter,
	DrivePrivacyParameters,
	FileNameParameter,
	GatewayParameter,
	ExternalTransactionIdParameter
} from '../parameter_declarations';
import { cliArDriveFactory } from '..';
import { SUCCESS_EXIT_CODE } from '../CLICommand/error_codes';
import { CLIAction } from '../CLICommand/action';
import { EID, TxID, Wallet } from 'ardrive-core-js';
import { getArweaveFromURL } from '../utils/get_arweave_for_url';

new CLICommand({
	name: 'create-shortcut',
	parameters: [
		FileIdParameter,
		FileNameParameter,
		ExternalTransactionIdParameter,
		BoostParameter,
		DryRunParameter,
		...DrivePrivacyParameters,
		GatewayParameter
	],
	action: new CLIAction(async function action(options) {
		const parameters = new ParametersHelper(options);
		const arweave = getArweaveFromURL(parameters.getGateway());

		const dryRun = parameters.isDryRun();
		const fileId = parameters.getRequiredParameterValue(FileIdParameter, EID);
		const newName = parameters.getRequiredParameterValue(FileNameParameter);
		const externalTxId = parameters.getRequiredParameterValue(ExternalTransactionIdParameter, TxID);

		const wallet: Wallet = await parameters.getRequiredWallet();
		const ardrive = cliArDriveFactory({
			wallet: wallet,
			feeMultiple: parameters.getOptionalBoostSetting(),
			dryRun,
			arweave
		});

		const result = await (async function () {
			if (await parameters.getIsPrivate()) {
				throw new Error('UNIMPLEMENTED!');
				const driveId = await ardrive.getDriveIdForFileId(fileId);
				const driveKey = await parameters.getDriveKey({ driveId });

				return ardrive.renamePrivateFile({
					fileId,
					newName,
					driveKey
				});
			} else {
				return ardrive.createPublicShortcut({
					externalTxId,
					fileId,
					name: newName
				});
			}
		})();

		console.log(JSON.stringify(result, null, 4));
		return SUCCESS_EXIT_CODE;
	})
});
