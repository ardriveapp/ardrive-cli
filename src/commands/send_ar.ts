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
		const transaction = await walletDao.prepareARToAddressTransaction(
			+options.arAmount,
			wallet,
			options.destAddress,
			[
				{ name: 'appName', value: 'ArDrive-CLI' },
				{ name: 'appVersion', value: '2.0' },
				{ name: 'trxType', value: 'transfer' }
			]
		);

		await walletDao.submitTransaction(transaction);

		console.log(
			JSON.stringify(
				{
					trxID: transaction.id,
					winston: transaction.quantity,
					reward: transaction.reward
				},
				null,
				4
			)
		);
		process.exit(0);
	}
});
