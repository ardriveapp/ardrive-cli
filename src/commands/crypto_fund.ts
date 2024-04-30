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
	TokenTypeParameter,
	WalletTypeParameters
} from '../parameter_declarations';
import { TurboFactory } from '@ardrive/turbo-sdk';

new CLICommand({
	name: 'crypto-fund',
	parameters: [
		ArAmountParameter,
		BoostParameter,
		DryRunParameter,
		TokenTypeParameter,
		...WalletTypeParameters,
		GatewayParameter
	],
	action: new CLIAction(async function action(options) {
		const parameters = new ParametersHelper(options);
		const arAmount = parameters.getRequiredParameterValue(ArAmountParameter, AR.from);

		const tokenType = parameters.getParameterValue(TokenTypeParameter);
		console.log('tokenType', tokenType);
		const ar = arAmount;
		console.log('ar', ar);
		const jwkWallet = (await parameters.getRequiredWallet()) as JWKWallet;

		// const signer = new HexSolanaSigner(bs58.encode(jwkWallet['jwk']));
		const turbo = TurboFactory.authenticated({
			token: tokenType as 'arweave',
			privateKey: jwkWallet['jwk'],
			gatewayUrl: 'https://api.devnet.solana.com',
			paymentServiceConfig: { url: 'https://payment.ardrive.dev' }
		});

		const res = await turbo.topUpWithTokens({ tokenAmount: +ar.valueOf() * 1e9 });

		// const res = await turbo.submitFundTransaction({
		// 	txId: 'Rkx7pi5aE85suorJ4SSBftRPUC4Ve1dQ33Zm2MgDYpzT4nRg2jPTHnVGuR3NizsspoM99QqJUdDuwymMDxE8AC2'
		// });
		console.log('res', JSON.stringify(res, null, 2));

		return SUCCESS_EXIT_CODE;
	})
});
