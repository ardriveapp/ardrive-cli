import { cliWalletDao } from '..';
import { CLICommand, ParametersHelper } from '../CLICommand';
import { SUCCESS_EXIT_CODE } from '../CLICommand/constants';
import { SeedPhraseParameter } from '../parameter_declarations';
import { SeedPhrase } from '../types';

new CLICommand({
	name: 'generate-wallet',
	parameters: [SeedPhraseParameter],
	async action(options) {
		const parameters = new ParametersHelper(options);
		const seedPhrase = parameters.getRequiredParameterValue(SeedPhraseParameter);
		const wallet = await cliWalletDao.generateJWKWallet(new SeedPhrase(seedPhrase));
		console.log(JSON.stringify(wallet));
		return SUCCESS_EXIT_CODE;
	}
});
