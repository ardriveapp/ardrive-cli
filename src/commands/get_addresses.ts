import { CLICommand, ParametersHelper } from '../CLICommand';
import { CLIAction } from '../CLICommand/action';
import { SUCCESS_EXIT_CODE } from '../CLICommand/error_codes';
import { WalletTypeParameters } from '../parameter_declarations';

new CLICommand({
	name: 'get-addresses',
	parameters: [...WalletTypeParameters],
	action: new CLIAction(async function action(options) {
		const parameters = new ParametersHelper(options);
		const addresses = await parameters.getWalletAddresses();
		console.log(JSON.stringify(addresses, null, 4));
		return SUCCESS_EXIT_CODE;
	})
});
