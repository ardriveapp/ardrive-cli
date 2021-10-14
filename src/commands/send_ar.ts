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

new CLICommand({
	name: 'send-ar',
	parameters: [ArAmountParameter, DestinationAddressParameter, WalletFileParameter, BoostParameter, DryRunParameter],
	async action(options) {
		const parameters = new ParametersHelper(options);
		const digitsOfPrecission = options.arAmount.split('.')[1].replace(/0*$/, '');
		if (digitsOfPrecission.length > 12) {
			throw new Error(`The AR amount must have a maximum of 12 digits of precision`);
		}
		const arAmount: number = +options.arAmount;
		const destAddress: string = options.destAddress;
		const wallet = await parameters.getRequiredWallet();
		const walletAddress = await wallet.getAddress();
		console.log(walletAddress);
		console.log(`arAmount: ${arAmount.toFixed(12)}`);
		console.log(`destAddress: ${destAddress}`);
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
