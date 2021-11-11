import { cliArweave } from '..';
import { CLICommand, ParametersHelper } from '../CLICommand';
import { DryRunParameter, TxFilePathParameter } from '../parameter_declarations';
import * as fs from 'fs';
import Transaction from 'arweave/node/lib/transaction';
import * as crypto from 'crypto';
import { b64UrlToBuffer, bufferTob64Url } from '../wallet';
import { ERROR_EXIT_CODE, SUCCESS_EXIT_CODE } from '../CLICommand/error_codes';
import { CLIAction } from '../CLICommand/action';

new CLICommand({
	name: 'send-tx',
	parameters: [TxFilePathParameter, DryRunParameter],
	action: new CLIAction(async function action(options) {
		const parameters = new ParametersHelper(options);
		const transaction = new Transaction(
			JSON.parse(fs.readFileSync(parameters.getRequiredParameterValue(TxFilePathParameter)).toString())
		);
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
	})
});
