import { CLICommand, ParametersHelper } from '../CLICommand';
import {
	BoostParameter,
	DryRunParameter,
	FileIdParameter,
	DrivePrivacyParameters,
	FileNameParameter,
	GatewayParameter,
	ExternalTransactionIdParameter,
	ParentFolderIdParameter
} from '../parameter_declarations';
import { cliArDriveFactory } from '..';
import { SUCCESS_EXIT_CODE } from '../CLICommand/error_codes';
import { CLIAction } from '../CLICommand/action';
import { EID, FileID, FolderID, TransactionID, TxID, Wallet } from 'ardrive-core-js';
import { getArweaveFromURL } from '../utils/get_arweave_for_url';

new CLICommand({
	name: 'create-shortcut',
	parameters: [
		{ name: FileIdParameter, required: false },
		{ name: FileNameParameter, required: false },
		ExternalTransactionIdParameter,
		ParentFolderIdParameter,
		BoostParameter,
		DryRunParameter,
		...DrivePrivacyParameters,
		GatewayParameter
	],
	action: new CLIAction(async function action(options) {
		const parameters = new ParametersHelper(options);
		const arweave = getArweaveFromURL(parameters.getGateway());

		const dryRun = parameters.isDryRun();
		const fileId: FileID | undefined = parameters.getParameterValue(FileIdParameter, EID);
		const newName: string | undefined = parameters.getParameterValue(FileNameParameter);
		const externalTxId: TransactionID = parameters.getRequiredParameterValue(ExternalTransactionIdParameter, TxID);
		const parentFolderId: FolderID = parameters.getRequiredParameterValue(ParentFolderIdParameter, EID);

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
			} else {
				return ardrive.createPublicShortcut({
					externalTxId,
					parentFolderId,
					fileId,
					name: newName
				});
			}
		})();

		console.log(JSON.stringify(result, null, 4));
		return SUCCESS_EXIT_CODE;
	})
});
