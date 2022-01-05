import { fetchMempool, TransactionID, TxID } from 'ardrive-core-js';
import { cliArweave } from '..';
import { CLICommand, ParametersHelper } from '../CLICommand';
import { CLIAction } from '../CLICommand/action';
import { ERROR_EXIT_CODE, SUCCESS_EXIT_CODE } from '../CLICommand/error_codes';
import { ConfirmationsParameter, TransactionIdParameter } from '../parameter_declarations';

const MIN_CONFIRMATIONS = 15;

new CLICommand({
	name: 'tx-status',
	parameters: [TransactionIdParameter, ConfirmationsParameter],
	action: new CLIAction(async function action(options) {
		const parameters = new ParametersHelper(options);
		const confirmations = parameters.getParameterValue<number>(ConfirmationsParameter, Number) ?? MIN_CONFIRMATIONS;
		const txId = parameters.getRequiredParameterValue(TransactionIdParameter, TxID);
		const transactionsInMempool = (await fetchMempool()).map((id) => new TransactionID(id));
		const pending = transactionsInMempool.some((tx) => tx.equals(txId));
		if (pending) {
			console.log(`${txId}: Pending`);
			return SUCCESS_EXIT_CODE;
		}

		const confStatus = (await cliArweave.transactions.getStatus(`${txId}`)).confirmed;

		if (!confStatus?.block_height) {
			console.log(`${txId}: Not found`);
			return ERROR_EXIT_CODE;
		}

		if (confStatus?.number_of_confirmations >= confirmations) {
			console.log(
				`${txId}: Mined at block height ${confStatus.block_height} with ${confStatus.number_of_confirmations} confirmations`
			);
		} else {
			console.log(
				`${txId}: Confirming at block height ${confStatus.block_height} with ${confStatus.number_of_confirmations} confirmations`
			);
		}

		return SUCCESS_EXIT_CODE;
	})
});
