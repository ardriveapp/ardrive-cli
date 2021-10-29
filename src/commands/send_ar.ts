import { cliWalletDao } from '..';
import { ArweaveAddress } from '../types/arweave_address';
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
import { AR } from '../types/winston';

new CLICommand({
	name: 'send-ar',
	parameters: [ArAmountParameter, DestinationAddressParameter, WalletFileParameter, BoostParameter, DryRunParameter],
	async action(options) {
		const parameters = new ParametersHelper(options);
		const arAmount = AR.from(options.arAmount);
		const destAddress = new ArweaveAddress(options.destAddress);
		const wallet = await parameters.getRequiredWallet();
		const walletAddress = await wallet.getAddress();
		console.log(`Source address: ${walletAddress}`);
		console.log(`AR amount sent: ${arAmount.toString()}`);
		console.log(`Destination address: ${destAddress}`);
		const rewardSetting = options.boost ? { feeMultiple: +options.boost } : undefined;

		const arTransferResult = await cliWalletDao.sendARToAddress(
			arAmount,
			wallet,
			destAddress,
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
