import { CLICommand, ParametersHelper } from '../CLICommand';
import { CLIAction } from '../CLICommand/action';
import { SUCCESS_EXIT_CODE } from '../CLICommand/error_codes';
import { AddressParameter, WalletTypeParameters } from '../parameter_declarations';
import { lastTxForAddress } from '../utils';

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
