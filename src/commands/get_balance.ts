import { AR, JWKWallet } from 'ardrive-core-js';
import axios from 'axios';
import { cliWalletDAOFactory } from '..';
import { CLICommand, ParametersHelper } from '../CLICommand';
import { CLIAction } from '../CLICommand/action';
import { SUCCESS_EXIT_CODE } from '../CLICommand/error_codes';
import { AddressParameter, GatewayParameter, WalletTypeParameters } from '../parameter_declarations';
import { toB64Url } from '../utils/base64';
import { getArweaveFromURL } from '../utils/get_arweave_for_url';
import { jwkInterfaceToPublicKey, jwkInterfaceToPrivateKey, signData, publicKeyToHeader } from '../utils/signData';

new CLICommand({
	name: 'get-balance',
	parameters: [...WalletTypeParameters, AddressParameter, GatewayParameter],
	action: new CLIAction(async function action(options) {
		const parameters = new ParametersHelper(options);
		const arweave = getArweaveFromURL(parameters.getGateway());
		const address = await parameters.getWalletAddress();
		const walletDAO = cliWalletDAOFactory(arweave);
		const balanceInWinston = await walletDAO.getAddressWinstonBalance(address);
		const balanceInAR = new AR(balanceInWinston);
		console.log(`Winston:\t${balanceInWinston}`);
		console.log(`AR:\t\t${balanceInAR}`);

		const wallet = (await parameters.getOptionalWallet()) as JWKWallet;

		if (wallet) {
			const nonce = '123';
			const publicKey = jwkInterfaceToPublicKey(wallet.getPrivateKey());
			const privateKey = jwkInterfaceToPrivateKey(wallet.getPrivateKey());
			const signature = await signData(privateKey, nonce);

			const { data } = await axios.get(`https://payment.ardrive.dev/v1/balance`, {
				headers: {
					'x-public-key': publicKeyToHeader(publicKey),
					'x-nonce': nonce,
					'x-signature': toB64Url(Buffer.from(signature))
				}
			});
			console.log(`Turbo Credits:\t${+data / 1_000_000_000_000}`);
		}

		return SUCCESS_EXIT_CODE;
	})
});
