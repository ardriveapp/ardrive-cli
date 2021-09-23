import { walletDao } from '..';
import { CLICommand } from '../CLICommand';
import { CommonContext } from '../CLICommand/common_context';
import { ArAmountParameter, DestinationAddressParameter, WalletFileParameter } from '../parameter_declarations';

/* eslint-disable no-console */

new CLICommand({
	name: 'send-ar',
	parameters: [ArAmountParameter, DestinationAddressParameter, WalletFileParameter],
	async action(options) {
		const context = new CommonContext(options);
		const wallet = await context.getWallet();
		const walletAddress = await wallet.getAddress();
		console.log(walletAddress);
		console.log(`arAmount: ${options.arAmount}`);
		console.log(`destAddress: ${options.destAddress}`);
		console.log(await walletDao.getAddressWinstonBalance(options.destAddress));
		const arTransferResult = await walletDao.sendARToAddress(+options.arAmount, wallet, options.destAddress, [
			{ name: 'appName', value: 'ArDrive-CLI' },
			{ name: 'appVersion', value: '2.0' },
			{ name: 'trxType', value: 'transfer' }
		]);

		console.log(JSON.stringify(arTransferResult, null, 4));
		process.exit(0);
	}
});
