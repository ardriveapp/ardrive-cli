import { cliWalletDao } from '..';
import { CLICommand, ParametersHelper } from '../CLICommand';
import { SUCCES_EXIT_CODE } from '../CLICommand/constants';
import { SeedPhraseParameter } from '../parameter_declarations';

new CLICommand({
	name: 'generate-wallet',
	parameters: [SeedPhraseParameter],
	async action(options) {
		const parameters = new ParametersHelper(options);
		const seedPhrase = await parameters.getRequiredParameterValue(SeedPhraseParameter);
		const wallet = await cliWalletDao.generateJWKWallet(seedPhrase);
		console.log(JSON.stringify(wallet));
		return SUCCES_EXIT_CODE;
	}
});
