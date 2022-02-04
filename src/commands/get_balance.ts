import { AR } from 'ardrive-core-js';
import { customArweaveCliWalletDAO } from '..';
import { CLICommand, ParametersHelper } from '../CLICommand';
import { CLIAction } from '../CLICommand/action';
import { SUCCESS_EXIT_CODE } from '../CLICommand/error_codes';
import { AddressParameter, GatewayParameter, WalletTypeParameters } from '../parameter_declarations';
import { getArweaveFromURL } from '../utils/get_arweave_for_url';

new CLICommand({
	name: 'get-balance',
	parameters: [...WalletTypeParameters, AddressParameter, GatewayParameter],
	action: new CLIAction(async function action(options) {
		const parameters = new ParametersHelper(options);
		const arweave = getArweaveFromURL(parameters.getGateway());
		const address = await parameters.getWalletAddress();
		const walletDAO = customArweaveCliWalletDAO(arweave);
		const balanceInWinston = await walletDAO.getAddressWinstonBalance(address);
		const balanceInAR = new AR(balanceInWinston);
		console.log(`${balanceInWinston}\tWinston`);
		console.log(`${balanceInAR}\tAR`);
		return SUCCESS_EXIT_CODE;
	})
});
