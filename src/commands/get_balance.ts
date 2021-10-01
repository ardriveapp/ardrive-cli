import { cliWalletDao } from '..';
import { CLICommand } from '../CLICommand';
import { ParametersHelper } from '../CLICommand/common_context';
import { DriveAddressParameter, SeedPhraseParameter, WalletFileParameter } from '../parameter_declarations';
import { Wallet } from '../wallet_new';

/* eslint-disable no-console */

new CLICommand({
	name: 'get-balance',
	parameters: [WalletFileParameter, SeedPhraseParameter],
	async action(options) {
		const context = new ParametersHelper(options, cliWalletDao);
		const wallet: Wallet | false = await context.getWallet().catch(() => {
			return false;
		});
		const address = wallet ? await wallet.getAddress() : context.getParameterValue(DriveAddressParameter);
		if (address) {
			const balance = await cliWalletDao.getAddressWinstonBalance(address);
			console.log(balance);
			process.exit(0);
		} else {
			console.log(`No wallet provided`);
			process.exit(1);
		}
	}
});
