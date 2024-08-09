import { AR, JWKWallet } from 'ardrive-core-js';
import { CLICommand } from '../CLICommand';
import { ParametersHelper } from '../CLICommand';
import { CLIAction } from '../CLICommand/action';
import { SUCCESS_EXIT_CODE } from '../CLICommand/error_codes';
import {
	CryptoAmountParameter,
	BoostParameter,
	DryRunParameter,
	GatewayParameter,
	TokenTypeParameter,
	TransactionIdParameter,
	WalletTypeParameters
} from '../parameter_declarations';
import {
	TurboFactory,
	ARToTokenAmount,
	ETHToTokenAmount,
	SOLToTokenAmount,
	tokenTypes,
	TokenType
} from '@ardrive/turbo-sdk';
import bs58 from 'bs58';

function isTokenType(tokenType: string): tokenType is TokenType {
	return tokenTypes.includes(tokenType as TokenType);
}

new CLICommand({
	name: 'crypto-fund',
	parameters: [
		CryptoAmountParameter,
		BoostParameter,
		DryRunParameter,
		TokenTypeParameter,
		...WalletTypeParameters,
		GatewayParameter,
		TransactionIdParameter
	],
	action: new CLIAction(async function action(options) {
		const parameters = new ParametersHelper(options);

		const tokenType = parameters.getParameterValue(TokenTypeParameter) ?? 'arweave';
		if (!isTokenType(tokenType)) {
			// TODO: Could be handled in param helper `getTokenType`
			throw new Error(`Invalid token type: ${tokenType}`);
		}

		const transactionId = parameters.getParameterValue(TransactionIdParameter);
		if (transactionId) {
			const turbo = TurboFactory.unauthenticated({
				paymentServiceConfig: { token: tokenType }
			});

			const res = await turbo.submitFundTransaction({
				txId: transactionId
			});
			console.log('res', JSON.stringify(res, null, 2));
			return SUCCESS_EXIT_CODE;
		}

		const cryptoAmount = parameters.getRequiredParameterValue(CryptoAmountParameter, AR.from);
		const jwkWallet = (await parameters.getRequiredWallet()) as JWKWallet;

		// TODO: These conversions could be done by convenience in the Turbo SDK
		const tokenConversions = {
			arweave: { token: ARToTokenAmount, wallet: () => jwkWallet['jwk'] },
			ethereum: { token: ETHToTokenAmount, wallet: () => jwkWallet['jwk'] },
			solana: { token: SOLToTokenAmount, wallet: () => bs58.encode(jwkWallet['jwk']) }
		};

		const turbo = TurboFactory.authenticated({
			token: tokenType,
			privateKey: tokenConversions[tokenType].wallet()
		});

		const res = await turbo.topUpWithTokens({
			tokenAmount: tokenConversions[tokenType].token(cryptoAmount.valueOf())
		});

		console.log('res', JSON.stringify(res, null, 2));

		return SUCCESS_EXIT_CODE;
	})
});
