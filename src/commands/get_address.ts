import { CLICommand, ParametersHelper } from '../CLICommand';
import { SUCCES_EXIT_CODE } from '../CLICommand/constants';
import { SeedPhraseParameter, WalletFileParameter } from '../parameter_declarations';

new CLICommand({
	name: 'get-address',
	parameters: [WalletFileParameter, SeedPhraseParameter],
	async action(options) {
		const parameters = new ParametersHelper(options);
		const address = await parameters.getWalletAddress();
		console.log(address);
		return SUCCES_EXIT_CODE;
	}
});
