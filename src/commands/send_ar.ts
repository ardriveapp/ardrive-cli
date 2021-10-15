import { cliWalletDao } from '..';
import { CLICommand } from '../CLICommand';
import { ParametersHelper } from '../CLICommand';
import {
	ArAmountParameter,
	BoostParameter,
	DestinationAddressParameter,
	DryRunParameter,
	WalletFileParameter
} from '../parameter_declarations';
import { assertARPrecision } from '../utils/ar_unit';

new CLICommand({
	name: 'send-ar',
	parameters: [ArAmountParameter, DestinationAddressParameter, WalletFileParameter, BoostParameter, DryRunParameter],
	async action(options) {
		assertARPrecision(options.arAmount);
		const parameters = new ParametersHelper(options);
		const arAmount: number = +options.arAmount;
		const destAddress: string = options.destAddress;
		const wallet = await parameters.getRequiredWallet();
		const walletAddress = await wallet.getAddress();
		console.log(walletAddress);
		console.log(`AR amount sent: ${arAmount.toFixed(12)}`);
		console.log(`Destination address: ${destAddress}`);
		const arTransferResult = await cliWalletDao.sendARToAddress(
			arAmount,
			wallet,
			options.destAddress,
			options.boost,
			options.dryRun,
			[
				{ name: 'appName', value: 'ArDrive-CLI' },
				{ name: 'appVersion', value: '2.0' },
				{ name: 'trxType', value: 'transfer' }
			]
		);

		console.log(JSON.stringify(arTransferResult, null, 4));
		process.exit(0);
	}
});
