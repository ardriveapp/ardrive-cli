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

/* eslint-disable no-console */

new CLICommand({
	name: 'send-ar',
	parameters: [ArAmountParameter, DestinationAddressParameter, WalletFileParameter, BoostParameter, DryRunParameter],
	async action(options) {
		const parameters = new ParametersHelper(options);
		const wallet = await parameters.getWallet();
		const walletAddress = await wallet.getAddress();
		console.log(walletAddress);
		console.log(`arAmount: ${options.arAmount}`);
		console.log(`destAddress: ${options.destAddress}`);
		console.log(await cliWalletDao.getAddressWinstonBalance(options.destAddress));
		const arTransferResult = await cliWalletDao.sendARToAddress(
			+options.arAmount,
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
