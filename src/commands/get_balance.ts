import { winstonToAr } from 'ardrive-core-js';
import { cliWalletDao } from '..';
import { CLICommand, ParametersHelper } from '../CLICommand';
import { SUCCESS_EXIT_CODE } from '../CLICommand/constants';
import { AddressParameter, WalletTypeParameters } from '../parameter_declarations';

new CLICommand({
	name: 'get-balance',
	parameters: [...WalletTypeParameters, AddressParameter],
	async action(options) {
		const parameters = new ParametersHelper(options);
		const address = await parameters.getWalletAddress();
		const balanceInWinston = await cliWalletDao.getAddressWinstonBalance(address);
		const balanceInAR = winstonToAr(balanceInWinston);
		console.log(`${balanceInWinston}\tWinston`);
		console.log(`${balanceInAR}\tAR`);
		return SUCCESS_EXIT_CODE;
	}
});
