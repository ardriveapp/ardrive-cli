import { arweave } from '..';
import { CLICommand } from '../CLICommand';
import { ConfirmationsParameter, TransactionIdParameter } from '../parameter_declarations';
import { fetchMempool } from '../utils';

/* eslint-disable no-console */

new CLICommand({
	name: 'tx-status',
	parameters: [TransactionIdParameter, ConfirmationsParameter],
	async action(options) {
		const { txId, confirmations } = options;
		const transactionsInMempool = await fetchMempool();
		const pending = transactionsInMempool.includes(txId);
		const confirmationAmount = confirmations ?? 15;

		if (pending) {
			console.log(`${txId}: Pending`);
			process.exit(0);
		}

		const confStatus = (await arweave.transactions.getStatus(txId)).confirmed;

		if (!confStatus?.block_height) {
			console.log(`${txId}: Not found`);
			process.exit(1);
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

		process.exit(0);
	}
});
