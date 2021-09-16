#!/usr/bin/env node

import { WalletDAO } from './wallet_new';
import Arweave from 'arweave';

if (require.main === module) {
	// Declares the commands

	// declare all parameters
	import('./parameter_declarations').then(() => {
		import('./commands');
	});
}

export const arweave = Arweave.init({
	host: 'arweave.net', // Arweave Gateway
	//host: 'arweave.dev', // Arweave Dev Gateway
	port: 443,
	protocol: 'https',
	timeout: 600000
});

export const walletDao = new WalletDAO(arweave);
