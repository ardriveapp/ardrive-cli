import { CLICommand, ParametersHelper } from '../CLICommand';
import { SUCCESS_EXIT_CODE } from '../CLICommand/constants';
import { WalletTypeParameters } from '../parameter_declarations';

new CLICommand({
	name: 'get-address',
	parameters: [...WalletTypeParameters],
	async action(options) {
		const parameters = new ParametersHelper(options);
		const address = await parameters.getWalletAddress();
		console.log(`${address}`);
		return SUCCESS_EXIT_CODE;
	}
});
