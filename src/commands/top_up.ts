import axios from 'axios';
import { CLICommand, ParametersHelper } from '../CLICommand';
import { CLIAction } from '../CLICommand/action';
import { ERROR_EXIT_CODE, SUCCESS_EXIT_CODE } from '../CLICommand/error_codes';
import {
	CurrencyTypeParameter,
	DestinationAddressParameter,
	PayInCliParameter,
	PaymentAmountParameter
} from '../parameter_declarations';
import { Stripe } from 'stripe';
import prompts from 'prompts';
import { exec } from 'child_process';

// ArDrive Stripe Test PUBLISHABLE Key. Enable this one to test workflows
const stripeTestPublishableKey =
	/* cspell:disable */ 'pk_test_51JUAtwC8apPOWkDLh2FPZkQkiKZEkTo6wqgLCtQoClL6S4l2jlbbc5MgOdwOUdU9Tn93NNvqAGbu115lkJChMikG00XUfTmo2z'; /* cspell:enable */

// ArDrive Stripe Production PUBLISHABLE Key. This one is safe to have on a front end application 👍
// const stripeProdPublishableKey =
// /* cspell:disable */ 'pk_live_51JUAtwC8apPOWkDLMQqNF9sPpfneNSPnwX8YZ8y1FNDl6v94hZIwzgFSYl27bWE4Oos8CLquunUswKrKcaDhDO6m002Yj9AeKj'; /* cspell:enable */

const stripe = new Stripe(stripeTestPublishableKey, { apiVersion: '2022-11-15' });

new CLICommand({
	name: 'top-up',
	parameters: [PaymentAmountParameter, CurrencyTypeParameter, PayInCliParameter, DestinationAddressParameter],
	action: new CLIAction(async function action(options) {
		const parameters = new ParametersHelper(options);

		const paymentAmount = parameters.getRequiredParameterValue(PaymentAmountParameter);
		const currencyType = parameters.getRequiredParameterValue(CurrencyTypeParameter);
		const destinationAddress = parameters.getRequiredParameterValue<string>(DestinationAddressParameter);
		const payInCli = parameters.getParameterValue<boolean>(PayInCliParameter);

		const method = payInCli ? 'payment-intent' : 'checkout-session';

		const { data } = await axios.get<{
			paymentSession: { client_secret: string; id: string; url: string };
			topUpQuote: { winstonCreditAmount: string };
		}>(
			// `http://localhost:3001/v1/top-up/${method}/${destinationAddress}/${currencyType}/${paymentAmount}`
			`https://payment.ardrive.dev/v1/top-up/${method}/${destinationAddress}/${currencyType}/${paymentAmount}`
		);

		const { client_secret, id, url } = data.paymentSession;

		console.error(`${method} from payment service has been successfully received!`);

		if (payInCli) {
			const { number } = await prompts<string>({
				type: 'text',
				name: 'number',
				message: 'Enter your card number'
			});

			const { expiration } = await prompts({
				type: 'text',
				name: 'expiration',
				message: 'Enter your card expiration with the format mm/dd. e.g: "01/26"'
			});

			const { cvc } = await prompts({
				type: 'password',
				name: 'cvc',
				message: 'Enter your card cvc'
			});

			// Use test card for faster testing 🚀
			// const testCard = { number: '4242424242424242', exp_month: 12, exp_year: 26, cvc: '123' };

			const [exp_month, exp_year] = (expiration as string).split('/').map((e) => +e);
			const realCard = { number: (number as string).replace('-', ''), exp_month, exp_year, cvc };

			console.error('Creating payment using Stripe payment method...');

			// Create the PaymentMethod using the details collected by the Payment Element
			const paymentMethod = await stripe.paymentMethods.create({
				type: 'card',
				card: realCard
			});

			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore
			await stripe.paymentIntents.confirm(id, {
				payment_method: paymentMethod.id,
				client_secret: client_secret
			});
		} else {
			// Build the Stripe Checkout URL with the Payment Intent client secret
			const checkoutUrl = url;

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
		}

		console.error(`You've topped up for ${+data.topUpQuote.winstonCreditAmount / 1_000_000_000_000} ARC!`);

		return SUCCESS_EXIT_CODE;
	})
});
