#!/usr/bin/env node

import { Wallet, WalletDAO } from './wallet_new';
import Arweave from 'arweave';
import { ArDriveCommunityOracle } from './community/ardrive_community_oracle';
import { ArDrive } from './ardrive';
import { ArFSDAO } from './arfsdao';

if (require.main === module) {
	// declare all parameters
	import('./parameter_declarations').then(() => {
		// declares the commands
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

export function arDriveFactory(wallet: Wallet): ArDrive {
	return new ArDrive(wallet, walletDao, new ArFSDAO(wallet, arweave), new ArDriveCommunityOracle(arweave));
}
