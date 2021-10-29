import { CLICommand, ParametersHelper } from '../CLICommand';
import { CLIAction } from '../CLICommand/action';
import { SUCCESS_EXIT_CODE } from '../CLICommand/constants';
import { SeedPhraseParameter, WalletFileParameter } from '../parameter_declarations';

new CLICommand({
	name: 'get-address',
	parameters: [WalletFileParameter, SeedPhraseParameter],
	action: new CLIAction(async function action(options) {
		const parameters = new ParametersHelper(options);
		const address = await parameters.getWalletAddress();
		console.log(`${address}`);
		return SUCCESS_EXIT_CODE;
	})
});
