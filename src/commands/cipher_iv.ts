import { ArFSDAO, TxID } from 'ardrive-core-js';
import { cliArweave } from '..';
import { CLICommand, ParametersHelper } from '../CLICommand';
import { CLIAction } from '../CLICommand/action';
import { SUCCESS_EXIT_CODE } from '../CLICommand/error_codes';
import { ConfirmationsParameter, TransactionIdParameter, WalletTypeParameters } from '../parameter_declarations';

new CLICommand({
	name: 'cipher-iv',
	parameters: [TransactionIdParameter, ConfirmationsParameter, ...WalletTypeParameters],
	action: new CLIAction(async function action(options) {
		const parameters = new ParametersHelper(options);
		const txId = parameters.getRequiredParameterValue(TransactionIdParameter, TxID);
		const wallet = await parameters.getRequiredWallet();
		const arFSDAO = new ArFSDAO(wallet, cliArweave);
		const cipherIVs = await arFSDAO.getCipherIVOfPrivateTransactionIDs([txId]);
		console.log(JSON.stringify(cipherIVs, null, 4));
		return SUCCESS_EXIT_CODE;
	})
});
