import { cliWalletDao } from '..';
import { CLICommand, ParametersHelper } from '../CLICommand';
import { CLIAction } from '../CLICommand/action';
import { SUCCESS_EXIT_CODE } from '../CLICommand/error_codes';
import { AddressParameter, WalletTypeParameters } from '../parameter_declarations';
import { AR } from '../types';

new CLICommand({
	name: 'get-balance',
	parameters: [...WalletTypeParameters, AddressParameter],
	action: new CLIAction(async function action(options) {
		const parameters = new ParametersHelper(options);
		const address = await parameters.getWalletAddress();
		const balanceInWinston = await cliWalletDao.getAddressWinstonBalance(address);
		const balanceInAR = new AR(balanceInWinston);
		console.log(`${balanceInWinston}\tWinston`);
		console.log(`${balanceInAR}\tAR`);
		return SUCCESS_EXIT_CODE;
	})
});
