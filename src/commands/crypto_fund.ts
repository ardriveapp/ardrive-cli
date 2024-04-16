import { AR, JWKWallet, Winston } from 'ardrive-core-js';
import { CLICommand } from '../CLICommand';
import { ParametersHelper } from '../CLICommand';
import { CLIAction } from '../CLICommand/action';
import { SUCCESS_EXIT_CODE } from '../CLICommand/error_codes';
import {
	ArAmountParameter,
	BoostParameter,
	DryRunParameter,
	GatewayParameter,
	WalletTypeParameters
} from '../parameter_declarations';
import { TurboFactory, WinstonToTokenAmount } from '@ardrive/turbo-sdk';

new CLICommand({
	name: 'crypto-fund',
	parameters: [ArAmountParameter, BoostParameter, DryRunParameter, ...WalletTypeParameters, GatewayParameter],
	action: new CLIAction(async function action(options) {
		const parameters = new ParametersHelper(options);
		const arAmount = parameters.getRequiredParameterValue(ArAmountParameter, AR.from);
		const winston: Winston = arAmount.toWinston();
		const jwkWallet = (await parameters.getRequiredWallet()) as JWKWallet;

		const turbo = TurboFactory.authenticated({ privateKey: jwkWallet.getPrivateKey() });

		const res = await turbo.topUpWithTokens({ tokenAmount: WinstonToTokenAmount(winston.valueOf()) });
		console.log('res', JSON.stringify(res, null, 2));

		return SUCCESS_EXIT_CODE;
	})
});
