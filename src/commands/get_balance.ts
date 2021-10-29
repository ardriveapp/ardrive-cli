import { winstonToAr } from 'ardrive-core-js';
import { cliWalletDao } from '..';
import { CLICommand, ParametersHelper } from '../CLICommand';
import { CLIAction } from '../CLICommand/action';
import { SUCCESS_EXIT_CODE } from '../CLICommand/constants';
import { AddressParameter, SeedPhraseParameter, WalletFileParameter } from '../parameter_declarations';

new CLICommand({
	name: 'get-balance',
	parameters: [WalletFileParameter, SeedPhraseParameter, AddressParameter],
	action: new CLIAction(async function action(options) {
		const parameters = new ParametersHelper(options);
		const address = await parameters.getWalletAddress();
		const balanceInWinston = await cliWalletDao.getAddressWinstonBalance(address);
		const balanceInAR = winstonToAr(balanceInWinston);
		console.log(`${balanceInWinston}\tWinston`);
		console.log(`${balanceInAR}\tAR`);
		return SUCCESS_EXIT_CODE;
	})
});
