import { cliWalletDAOFactory } from '..';
import { CLICommand } from '../CLICommand';
import { ParametersHelper } from '../CLICommand';
import { CLIAction } from '../CLICommand/action';
import { ERROR_EXIT_CODE, SUCCESS_EXIT_CODE } from '../CLICommand/error_codes';
import { DebugParameter, GatewayParameter, WalletFileParameter } from '../parameter_declarations';
import { getArweaveFromURL } from '../utils/get_arweave_for_url';

new CLICommand({
	name: 'test-wallet',
	parameters: [WalletFileParameter, GatewayParameter, DebugParameter],
	action: new CLIAction(async function action(options) {
		const parameters = new ParametersHelper(options);
		parameters.getRequiredParameterValue(WalletFileParameter);
		const wallet = await parameters.getRequiredWallet();
		const arweave = getArweaveFromURL(parameters.getGateway());
		const walletDAO = cliWalletDAOFactory(arweave);
		const shouldDebug = parameters.getParameterValue(DebugParameter);

		try {
			await walletDAO.testWallet(wallet);

			console.log('Wallet OK');
			return SUCCESS_EXIT_CODE;
		} catch (e) {
			if (shouldDebug) {
				console.error(e);
			}
			console.error('BAD WALLET!');
			return ERROR_EXIT_CODE;
		}
	})
});
