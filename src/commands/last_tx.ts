import { ArweaveAddress } from 'ardrive-core-js';
import { CLICommand, ParametersHelper } from '../CLICommand';
import { CLIAction } from '../CLICommand/action';
import { SUCCESS_EXIT_CODE } from '../CLICommand/error_codes';
import { AddressParameter, GatewayParameter, WalletTypeParameters } from '../parameter_declarations';
import axios, { AxiosResponse } from 'axios';

async function lastTxForAddress(gateway: URL, address: ArweaveAddress): Promise<string> {
	const response: AxiosResponse = await axios.get(`${gateway.href}wallet/${address}/last_tx`);
	return `${response.data}`;
}

new CLICommand({
	name: 'last-tx',
	parameters: [...WalletTypeParameters, AddressParameter, GatewayParameter],
	action: new CLIAction(async function action(options) {
		const parameters = new ParametersHelper(options);
		const gateway = parameters.getGateway();
		const walletAddress = await parameters.getWalletAddress();
		const lastTx = await lastTxForAddress(gateway, walletAddress);
		console.log(lastTx);
		return SUCCESS_EXIT_CODE;
	})
});
