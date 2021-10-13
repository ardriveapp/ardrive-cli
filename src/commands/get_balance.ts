import { cliWalletDao } from '..';
import { CLICommand, ParametersHelper } from '../CLICommand';
import { AddressParameter, SeedPhraseParameter, WalletFileParameter } from '../parameter_declarations';

const anArInWinston = 1_000_000_000_000;
const numberOfDigitsAfterComma = 8;

new CLICommand({
	name: 'get-balance',
	parameters: [WalletFileParameter, SeedPhraseParameter, AddressParameter],
	async action(options) {
		const parameters = new ParametersHelper(options);
		const address = await parameters.getWalletAddress();
		const balanceInWinston = await cliWalletDao.getAddressWinstonBalance(address);
		const balanceInAR = balanceInWinston / anArInWinston;
		const roundedBalanceInAR = balanceInAR.toFixed(numberOfDigitsAfterComma);
		console.log(`${roundedBalanceInAR} AR`);
		process.exit(0);
	}
});
