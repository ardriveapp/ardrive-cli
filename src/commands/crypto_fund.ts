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
	TransactionIdParameter,
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
		GatewayParameter,
		TransactionIdParameter
	],
	action: new CLIAction(async function action(options) {
		const parameters = new ParametersHelper(options);

		const tokenType = parameters.getParameterValue(TokenTypeParameter);

		const transactionId = parameters.getParameterValue(TransactionIdParameter);
		if (transactionId) {
			const turbo = TurboFactory.unauthenticated({
				paymentServiceConfig: { token: tokenType as 'arweave' }
			});

			const res = await turbo.submitFundTransaction({
				txId: transactionId
			});
			console.log('res', JSON.stringify(res, null, 2));
			return SUCCESS_EXIT_CODE;
		}

		const arAmount = parameters.getRequiredParameterValue(ArAmountParameter, AR.from);
		const jwkWallet = (await parameters.getRequiredWallet()) as JWKWallet;

		const turbo = TurboFactory.authenticated({
			token: 'ethereum',
			privateKey: jwkWallet['jwk']
		});
		console.log("jwkWallet['jwk']", jwkWallet['jwk']);

		const res = await turbo.topUpWithTokens({ tokenAmount: +arAmount.valueOf() * 1e18 });

		// const res = await turbo.submitFundTransaction({
		// 	txId: 'Rkx7pi5aE85suorJ4SSBftRPUC4Ve1dQ33Zm2MgDYpzT4nRg2jPTHnVGuR3NizsspoM99QqJUdDuwymMDxE8AC2'
		// });
		console.log('res', JSON.stringify(res, null, 2));

		return SUCCESS_EXIT_CODE;
	})
});
