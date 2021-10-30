import { cliWalletDao } from '..';
import { CLICommand, ParametersHelper } from '../CLICommand';
import { CLIAction } from '../CLICommand/action';
import { SUCCESS_EXIT_CODE } from '../CLICommand/error_codes';
import { SeedPhraseParameter } from '../parameter_declarations';

new CLICommand({
	name: 'generate-wallet',
	parameters: [SeedPhraseParameter],
	action: new CLIAction(async function action(options) {
		const parameters = new ParametersHelper(options);
		const seedPhrase = await parameters.getRequiredParameterValue(SeedPhraseParameter);
		const wallet = await cliWalletDao.generateJWKWallet(seedPhrase);
		console.log(JSON.stringify(wallet));
		return SUCCESS_EXIT_CODE;
	})
});
