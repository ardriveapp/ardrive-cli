import { cliArweave } from '..';
import { CLICommand } from '../CLICommand';
import { ERROR_EXIT_CODE, SUCCESS_EXIT_CODE } from '../CLICommand/constants';
import { DryRunParameter, TxFilePathParameter } from '../parameter_declarations';
import * as fs from 'fs';
import Transaction from 'arweave/node/lib/transaction';
import * as crypto from 'crypto';
import { b64UrlToBuffer, bufferTob64Url } from '../wallet';

new CLICommand({
	name: 'send-tx',
	parameters: [TxFilePathParameter, DryRunParameter],
	async action(options) {
		const transaction = new Transaction(JSON.parse(fs.readFileSync(options.txFilePath).toString()));
		const srcAddress = bufferTob64Url(
			crypto.createHash('sha256').update(b64UrlToBuffer(transaction.owner)).digest()
		);

		console.log(`Source address: ${srcAddress}`);
		console.log(`AR amount sent: ${cliArweave.ar.winstonToAr(transaction.quantity)}`);
		console.log(`Destination address: ${transaction.target}`);

		const response = await (async () => {
			if (options.dryRun) {
				return { status: 200, statusText: 'OK', data: '' };
			} else {
				return await cliArweave.transactions.post(transaction);
			}
		})();
		if (response.status === 200 || response.status === 202) {
			console.log(
				JSON.stringify(
					{
						trxID: transaction.id,
						winston: transaction.quantity,
						reward: transaction.reward
					},
					null,
					4
				)
			);

			return SUCCESS_EXIT_CODE;
		} else {
			console.log(`Failed to send tx with error: ${response.statusText}`);
		}

		return ERROR_EXIT_CODE;
	}
});
