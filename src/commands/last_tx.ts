import { ArweaveAddress } from 'ardrive-core-js';
import { CLICommand, ParametersHelper } from '../CLICommand';
import { CLIAction } from '../CLICommand/action';
import { SUCCESS_EXIT_CODE } from '../CLICommand/error_codes';
import { AddressParameter, WalletTypeParameters } from '../parameter_declarations';

async function lastTxForAddress(address: ArweaveAddress): Promise<string> {
	const response = await fetch(`https://arweave.net/wallet/${address}/last_tx`);
	return response.text();
}

new CLICommand({
	name: 'last-tx',
	parameters: [...WalletTypeParameters, AddressParameter],
	action: new CLIAction(async function action(options) {
		const parameters = new ParametersHelper(options);
		const walletAddress = await parameters.getWalletAddress();
		const lastTx = await lastTxForAddress(walletAddress);
		console.log(lastTx);
		return SUCCESS_EXIT_CODE;
	})
});
