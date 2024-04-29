import { AR, JWKWallet } from 'ardrive-core-js';
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
import { TurboFactory, HexSolanaSigner } from '@ardrive/turbo-sdk';
import bs58 from 'bs58';

new CLICommand({
	name: 'crypto-fund',
	parameters: [ArAmountParameter, BoostParameter, DryRunParameter, ...WalletTypeParameters, GatewayParameter],
	action: new CLIAction(async function action(options) {
		const parameters = new ParametersHelper(options);
		const arAmount = parameters.getRequiredParameterValue(ArAmountParameter, AR.from);
		const ar = arAmount;
		const jwkWallet = (await parameters.getRequiredWallet()) as JWKWallet;

		const signer = new HexSolanaSigner(bs58.encode(jwkWallet['jwk']));
		const turbo = TurboFactory.authenticated({
			signer,
			gatewayUrl: 'https://api.devnet.solana.com',
			paymentServiceConfig: { url: 'https://payment.ardrive.dev' }
		});

		const res = await turbo.topUpWithTokens({ tokenAmount: +ar.valueOf() * 1e9 });
		console.log('res', JSON.stringify(res, null, 2));

		return SUCCESS_EXIT_CODE;
	})
});
