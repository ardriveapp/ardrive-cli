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

new CLICommand({
	name: 'send-ar',
	parameters: [ArAmountParameter, DestinationAddressParameter, WalletFileParameter, BoostParameter, DryRunParameter],
	async action(options) {
		const parameters = new ParametersHelper(options);
		const wallet = await parameters.getRequiredWallet();
		const walletAddress = await wallet.getAddress();
		console.log(walletAddress);
		console.log(`arAmount: ${options.arAmount}`);
		console.log(`destAddress: ${options.destAddress}`);
		const arTransferResult = await cliWalletDao.sendARToAddress(
			+options.arAmount,
			wallet,
			options.destAddress,
			{ feeMultiple: +options.boost },
			options.dryRun,
			[
				{ name: 'App-Name', value: 'ArDrive-CLI' },
				{ name: 'App-Version', value: '2.0' },
				{ name: 'Type', value: 'transfer' }
			]
		);

		console.log(JSON.stringify(arTransferResult, null, 4));
		return SUCCESS_EXIT_CODE;
	}
});
