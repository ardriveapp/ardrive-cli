import { cliArweave } from '..';
import { CLICommand } from '../CLICommand';
import { CLIAction } from '../CLICommand/action';
import { ERROR_EXIT_CODE, SUCCESS_EXIT_CODE } from '../CLICommand/error_codes';
import { ConfirmationsParameter, TransactionIdParameter } from '../parameter_declarations';
import { TransactionID } from '../types';
import { fetchMempool } from '../utils';

new CLICommand({
	name: 'tx-status',
	parameters: [TransactionIdParameter, ConfirmationsParameter],
	action: new CLIAction(async function action(options) {
		const { confirmations } = options;
		const txId = new TransactionID(options.txId);
		const transactionsInMempool = (await fetchMempool()).map((id) => new TransactionID(id));
		const pending = transactionsInMempool.some((tx) => tx.equals(txId));
		const confirmationAmount = confirmations ?? 15;

		if (pending) {
			console.log(`${txId}: Pending`);
			return SUCCESS_EXIT_CODE;
		}

		const confStatus = (await cliArweave.transactions.getStatus(`${txId}`)).confirmed;

		if (!confStatus?.block_height) {
			console.log(`${txId}: Not found`);
			return ERROR_EXIT_CODE;
		}

		if (confStatus?.number_of_confirmations >= confirmationAmount) {
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
