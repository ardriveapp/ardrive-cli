import { cliWalletDao } from '..';
import { CLICommand } from '../CLICommand';
import { ParametersHelper } from '../CLICommand/common_context';
import { SeedPhraseParameter, WalletFileParameter } from '../parameter_declarations';

/* eslint-disable no-console */

new CLICommand({
	name: 'get-address',
	parameters: [WalletFileParameter, SeedPhraseParameter],
	async action(options) {
		const context = new ParametersHelper(options, cliWalletDao);
		const address = await context
			.getWallet()
			.then((wallet) => {
				return wallet.getAddress();
			})
			.catch(() => {
				console.log(`No wallet provided`);
				process.exit(1);
			});
		console.log(address);
		process.exit(0);
	}
});
