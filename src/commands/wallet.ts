import { walletDao } from '..';
import { CLICommand } from '../CLICommand';
import { CommonContext } from '../CLICommand/common_context';
import {
	ArAmountParameter,
	DestinationAddressParameter,
	DriveAddressParameter,
	SeedPhraseParameter,
	WalletFileParameter
} from '../parameter_declarations';
import { Wallet } from '../wallet_new';

/* eslint-disable no-console */

new CLICommand({
	name: 'get-balance',
	parameters: [WalletFileParameter, SeedPhraseParameter],
	async action(options) {
		const context = new CommonContext(options);
		const wallet: Wallet | false = await context.getWallet().catch(() => {
			return false;
		});
		const address = wallet ? await wallet.getAddress() : context.getParameterValue(DriveAddressParameter);
		if (address) {
			const balance = await walletDao.getAddressWinstonBalance(address);
			console.log(balance);
			process.exit(0);
		} else {
			console.log(`No wallet provided`);
			process.exit(1);
		}
	}
});

new CLICommand({
	name: 'get-address',
	parameters: [WalletFileParameter, SeedPhraseParameter],
	async action(options) {
		const context = new CommonContext(options);
		const address = await context
			.getWallet()
			.then((wallet) => {
				return wallet.getAddress();
			})
			.catch(() => {
				console.log(`No wallet provided`);
				process.exit(1);
			});
		console.log(address);
		process.exit(0);
	}
});

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
		console.log(
			JSON.stringify(
				await walletDao.sendARToAddress(+options.arAmount, wallet, options.destAddress, [
					{ name: 'appName', value: 'ArDrive-CLI' },
					{ name: 'appVersion', value: '2.0' },
					{ name: 'trxType', value: 'transfer' },
					{ name: 'foo', value: 'bar' }
				]),
				null,
				4
			)
		);
		process.exit(0);
	}
});

new CLICommand({
	name: 'generate-seedphrase',
	parameters: [],
	async action() {
		const seedPhrase = await walletDao.generateSeedPhrase();
		console.log(JSON.stringify(seedPhrase));
		process.exit(0);
	}
});

new CLICommand({
	name: 'generate-wallet',
	parameters: [SeedPhraseParameter],
	async action(options) {
		if (!options.seedPhrase) {
			throw new Error('Missing required seed phrase');
		}
		const wallet = await walletDao.generateJWKWallet(options.seed);
		console.log(JSON.stringify(wallet));
		process.exit(0);
	}
});
