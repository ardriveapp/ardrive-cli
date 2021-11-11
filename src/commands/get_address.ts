import { CLICommand, ParametersHelper } from '../CLICommand';
import { CLIAction } from '../CLICommand/action';
import { SUCCESS_EXIT_CODE } from '../CLICommand/error_codes';
import { WalletTypeParameters } from '../parameter_declarations';

new CLICommand({
	name: 'get-address',
	parameters: [...WalletTypeParameters],
	action: new CLIAction(async function action(options) {
		const parameters = new ParametersHelper(options);
		const address = await parameters.getWalletAddress();
		console.log(`${address}`);
		return SUCCESS_EXIT_CODE;
	})
});
