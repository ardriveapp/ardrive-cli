import { cliWalletDao } from '..';
import { CLICommand, ParametersHelper } from '../CLICommand';
import { SUCCESS_EXIT_CODE } from '../CLICommand/constants';
import { AddressParameter, SeedPhraseParameter, WalletFileParameter } from '../parameter_declarations';
import { AR } from '../types';

new CLICommand({
	name: 'get-balance',
	parameters: [WalletFileParameter, SeedPhraseParameter, AddressParameter],
	async action(options) {
		const parameters = new ParametersHelper(options);
		const address = await parameters.getWalletAddress();
		const balanceInWinston = await cliWalletDao.getAddressWinstonBalance(address);
		const balanceInAR = new AR(balanceInWinston);
		console.log(`${balanceInWinston}\tWinston`);
		console.log(`${balanceInAR}\tAR`);
		return SUCCESS_EXIT_CODE;
	}
});
