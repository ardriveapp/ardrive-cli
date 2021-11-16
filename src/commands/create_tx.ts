import { ADDR, AR, JWKWallet, Winston } from 'ardrive-core-js';
import { CreateTransactionInterface } from 'arweave/node/common';
import { cliArweave, CLI_APP_NAME, CLI_APP_VERSION } from '..';
import { CLICommand } from '../CLICommand';
import { ParametersHelper } from '../CLICommand';
import { CLIAction } from '../CLICommand/action';
import { SUCCESS_EXIT_CODE } from '../CLICommand/error_codes';
import {
	ArAmountParameter,
	DestinationAddressParameter,
	LastTxParameter,
	RewardParameter,
	WalletTypeParameters
} from '../parameter_declarations';

new CLICommand({
	name: 'create-tx',
	parameters: [
		ArAmountParameter,
		DestinationAddressParameter,
		RewardParameter,
		LastTxParameter,
		...WalletTypeParameters
	],
	action: new CLIAction(async function action(options) {
		const parameters = new ParametersHelper(options);
		const arAmount = parameters.getRequiredParameterValue(ArAmountParameter, AR.from);
		const winston: Winston = arAmount.toWinston();
		const destAddress = parameters.getRequiredParameterValue(DestinationAddressParameter, ADDR);
		const jwkWallet = (await parameters.getRequiredWallet()) as JWKWallet;

		// Create and sign transaction
		const trxAttributes: Partial<CreateTransactionInterface> = {
			target: destAddress.toString(),
			quantity: winston.toString(),
			reward: parameters.getParameterValue(RewardParameter),
			last_tx: parameters.getParameterValue(LastTxParameter)
		};
		const transaction = await cliArweave.createTransaction(trxAttributes, jwkWallet.getPrivateKey());
		transaction.addTag('App-Name', CLI_APP_NAME);
		transaction.addTag('App-Version', CLI_APP_VERSION);
		transaction.addTag('Type', 'transfer');

		await cliArweave.transactions.sign(transaction, jwkWallet.getPrivateKey());

		console.log(JSON.stringify(transaction));

		return SUCCESS_EXIT_CODE;
	})
});
