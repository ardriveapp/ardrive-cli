import { cliWalletDao } from '..';
import { CLICommand, ParametersHelper } from '../CLICommand';
import { AddressParameter, SeedPhraseParameter, WalletFileParameter } from '../parameter_declarations';

/* eslint-disable no-console */

new CLICommand({
	name: 'get-balance',
	parameters: [WalletFileParameter, SeedPhraseParameter, AddressParameter],
	async action(options) {
		const parameters = new ParametersHelper(options);
		const address = await parameters.getWalletAddress();
		const balance = await cliWalletDao.getAddressWinstonBalance(address);
		console.log(balance);
		process.exit(0);
	}
});
