import { CreateTransactionInterface } from 'arweave/node/common';
import { cliArweave } from '..';
import { ArweaveAddress } from '../arweave_address';
import { CLICommand } from '../CLICommand';
import { ParametersHelper } from '../CLICommand';
import { SUCCESS_EXIT_CODE } from '../CLICommand/constants';
import {
	ArAmountParameter,
	DestinationAddressParameter,
	LastTxParameter,
	RewardParameter,
	WalletFileParameter
} from '../parameter_declarations';
import { Winston } from '../types';
import { assertARPrecision } from '../utils/ar_unit';
import { JWKWallet } from '../wallet';

new CLICommand({
	name: 'create-tx',
	parameters: [ArAmountParameter, DestinationAddressParameter, WalletFileParameter, RewardParameter, LastTxParameter],
	async action(options) {
		assertARPrecision(options.arAmount);
		const parameters = new ParametersHelper(options);
		const arAmount: number = +options.arAmount;
		const winston: Winston = cliArweave.ar.arToWinston(arAmount.toString());
		const destAddress = new ArweaveAddress(options.destAddress);
		const jwkWallet = (await parameters.getRequiredWallet()) as JWKWallet;

		// Create and sign transaction
		const trxAttributes: Partial<CreateTransactionInterface> = {
			target: destAddress.toString(),
			quantity: winston,
			reward: options.reward,
			last_tx: options.lastTx
		};
		const transaction = await cliArweave.createTransaction(trxAttributes, jwkWallet.getPrivateKey());
		transaction.addTag('App-Name', 'ArDrive-CLI');
		transaction.addTag('App-Version', '2.0');
		transaction.addTag('Type', 'transfer');

		await cliArweave.transactions.sign(transaction, jwkWallet.getPrivateKey());

		console.log(JSON.stringify(transaction));

		return SUCCESS_EXIT_CODE;
	}
});
