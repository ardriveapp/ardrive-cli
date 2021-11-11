import { cliWalletDao, CLI_APP_NAME, CLI_APP_VERSION } from '..';
import { ArweaveAddress } from '../arweave_address';
import { CLICommand } from '../CLICommand';
import { ParametersHelper } from '../CLICommand';
import { SUCCESS_EXIT_CODE } from '../CLICommand/constants';
import {
	ArAmountParameter,
	BoostParameter,
	DestinationAddressParameter,
	DryRunParameter,
	WalletTypeParameters
} from '../parameter_declarations';
import { assertARPrecision } from '../utils/ar_unit';

new CLICommand({
	name: 'send-ar',
	parameters: [
		ArAmountParameter,
		DestinationAddressParameter,
		BoostParameter,
		DryRunParameter,
		...WalletTypeParameters
	],
	async action(options) {
		assertARPrecision(options.arAmount);
		const parameters = new ParametersHelper(options);
		const arAmount: number = +options.arAmount;
		const destAddress = new ArweaveAddress(options.destAddress);
		const wallet = await parameters.getRequiredWallet();
		const walletAddress = await wallet.getAddress();
		console.log(`Source address: ${walletAddress}`);
		console.log(`AR amount sent: ${arAmount.toFixed(12)}`);
		console.log(`Destination address: ${destAddress}`);
		const rewardSetting = options.boost ? { feeMultiple: +options.boost } : undefined;

		const arTransferResult = await cliWalletDao.sendARToAddress(
			arAmount,
			wallet,
			destAddress,
			rewardSetting,
			options.dryRun,
			[
				{ name: 'App-Name', value: CLI_APP_NAME },
				{ name: 'App-Version', value: CLI_APP_VERSION },
				{ name: 'Type', value: 'transfer' }
			],
			true
		);

		console.log(JSON.stringify(arTransferResult, null, 4));
		return SUCCESS_EXIT_CODE;
	}
});
