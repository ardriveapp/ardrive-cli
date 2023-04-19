import { JWKWallet } from 'ardrive-core-js';
import axios from 'axios';
import { exec } from 'child_process';
import { CLICommand, ParametersHelper } from '../CLICommand';
import { CLIAction } from '../CLICommand/action';
import { ERROR_EXIT_CODE, SUCCESS_EXIT_CODE } from '../CLICommand/error_codes';
import { CurrencyTypeParameter, PaymentAmountParameter, WalletTypeParameters } from '../parameter_declarations';
import { toB64Url } from '../utils/base64';
import { jwkToPem } from '../utils/pem';
import { signData } from '../utils/signData';

new CLICommand({
	name: 'top-up',
	parameters: [PaymentAmountParameter, CurrencyTypeParameter, ...WalletTypeParameters],
	action: new CLIAction(async function action(options) {
		const parameters = new ParametersHelper(options);

		const walletFile = (await parameters.getRequiredWallet()) as JWKWallet;
		const paymentAmount = parameters.getRequiredParameterValue(PaymentAmountParameter);
		const currencyType = parameters.getRequiredParameterValue(CurrencyTypeParameter);

		const nonce = '123';
		const signature = await signData(jwkToPem(walletFile.getPrivateKey()), nonce);
		const publicKey = toB64Url(Buffer.from(jwkToPem(walletFile.getPrivateKey(), true)));

		const { data } = await axios.get<{ checkoutSession: { url: string } }>(
			// `http://localhost:3000/v1/price-quote/${currencyType}/${paymentAmount}`,
			`https://payment.ardrive.dev/v1/price-quote/${currencyType}/${paymentAmount}`,
			{
				headers: {
					'x-public-key': publicKey,
					'x-nonce': nonce,
					'x-signature': toB64Url(Buffer.from(signature))
				}
			}
		);

		// Build the Stripe Checkout URL with the Payment Intent client secret
		const checkoutUrl = data.checkoutSession.url;

		// Open the user's default browser and redirect them to the Stripe Checkout page
		console.error(
			'Checkout session from payment service has been successfully received!\nOpening default browser and sending to Stripe checkout...'
		);

		try {
			if (process.platform === 'darwin') {
				// macOS
				exec(`open ${checkoutUrl}`);
			} else if (process.platform === 'win32') {
				// Windows
				exec(`start "" "${checkoutUrl}"`);
			} else {
				// Linux/Unix
				open(checkoutUrl);
			}
		} catch (error) {
			console.error(error);
			console.error(
				'Stripe checkout session failed to open! Please go here in a browser to fulfill your top up quote: ',
				checkoutUrl
			);
			return ERROR_EXIT_CODE;
		}

		return SUCCESS_EXIT_CODE;
	})
});
