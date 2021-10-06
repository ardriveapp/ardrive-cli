#!/usr/bin/env node

import { Wallet, WalletDAO } from './wallet_new';
import Arweave from 'arweave';
import { ArDriveCommunityOracle } from './community/ardrive_community_oracle';
import { ArDrive, ArDriveAnonymous } from './ardrive';
import { ArFSDAO, ArFSDAOAnonymous } from './arfsdao';
import { ARDataPriceEstimator } from './utils/ar_data_price_estimator';
import { ARDataPriceRegressionEstimator } from './utils/ar_data_price_regression_estimator';
import { FeeMultiple } from './types';

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

export interface ArDriveSettingsAnonymous {
	arweave?: Arweave;
}
export interface ArDriveSettings extends ArDriveSettingsAnonymous {
	wallet: Wallet;
	walletDao?: WalletDAO;
	priceEstimator?: ARDataPriceEstimator;
	feeMultiple?: FeeMultiple;
	dryRun?: boolean;
}

function settingsHasWallet(settings: ArDriveSettings | ArDriveSettingsAnonymous): settings is ArDriveSettings {
	// Anonymous settings do not require a wallet
	return Object.keys(settings).includes('wallet');
}

export function arDriveFactory(settings?: ArDriveSettingsAnonymous): ArDriveAnonymous;
export function arDriveFactory(settings: ArDriveSettings): ArDrive;
export function arDriveFactory(settings?: ArDriveSettings | ArDriveSettingsAnonymous): ArDrive | ArDriveAnonymous {
	const arweave = settings && settings.arweave ? settings.arweave : cliArweave;

	if (!settings || !settingsHasWallet(settings)) {
		return new ArDriveAnonymous(new ArFSDAOAnonymous(arweave, CLI_APP_NAME, CLI_APP_VERSION));
	}

	const priceEstimator = settings.priceEstimator || new ARDataPriceRegressionEstimator();
	const walletDao = settings.walletDao || cliWalletDao;

	return new ArDrive(
		settings.wallet,
		walletDao,
		new ArFSDAO(settings.wallet, arweave, settings.dryRun, CLI_APP_NAME, CLI_APP_VERSION),
		new ArDriveCommunityOracle(arweave),
		CLI_APP_NAME,
		CLI_APP_VERSION,
		priceEstimator,
		settings.feeMultiple,
		settings.dryRun
	);
}

// return new ArDriveAnonymous(new ArFSDAOAnonymous(arweave, CLI_APP_NAME, CLI_APP_VERSION));
