#!/usr/bin/env node

import { Wallet, WalletDAO } from './wallet_new';
import Arweave from 'arweave';
import { ArDriveCommunityOracle } from './community/ardrive_community_oracle';
import { ArDrive } from './ardrive';
import { ArFSDAO } from './arfsdao';
import { ARDataPriceRegressionEstimator } from './utils/ar_data_price_regression_estimator';
import { ARDataPriceEstimator } from './utils/ar_data_price_estimator';

if (require.main === module) {
	// declare all parameters
	import('./parameter_declarations').then(() => {
		// declares the commands
		import('./commands');
	});
}

export const CLI_APP_NAME = 'ArDrive-CLI';
export const CLI_APP_VERSION = '2.0';

// TODO: Make configurable from CLI
export const cliArweave = Arweave.init({
	host: 'arweave.net', // Arweave Gateway
	//host: 'arweave.dev', // Arweave Dev Gateway
	port: 443,
	protocol: 'https',
	timeout: 600000
});

export const cliWalletDao = new WalletDAO(cliArweave, CLI_APP_NAME, CLI_APP_VERSION);

export function arDriveFactory(
	wallet: Wallet,
	priceEstimator: ARDataPriceEstimator = new ARDataPriceRegressionEstimator(),
	walletDao: WalletDAO = cliWalletDao,
	arweave: Arweave = cliArweave
): ArDrive {
	return new ArDrive(
		wallet,
		walletDao,
		new ArFSDAO(wallet, arweave),
		new ArDriveCommunityOracle(arweave),
		CLI_APP_NAME,
		CLI_APP_VERSION,
		priceEstimator
	);
}
