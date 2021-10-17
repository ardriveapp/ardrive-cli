import { cliWalletDao } from '..';
import { CLICommand } from '../CLICommand';
import { ParametersHelper } from '../CLICommand';
import { SUCCESS_EXIT_CODE } from '../CLICommand/constants';
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
		const rewardSetting = options.boost ? { feeMultiple: +options.boost } : undefined;

		const arTransferResult = await cliWalletDao.sendARToAddress(
			arAmount,
			wallet,
			options.destAddress,
			rewardSetting,
			options.dryRun,
			[
				{ name: 'App-Name', value: 'ArDrive-CLI' },
				{ name: 'App-Version', value: '2.0' },
				{ name: 'Type', value: 'transfer' }
			],
			true
		);

		console.log(JSON.stringify(arTransferResult, null, 4));
		return SUCCESS_EXIT_CODE;
	}
});
