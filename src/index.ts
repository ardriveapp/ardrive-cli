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

export interface ArDriveSettingsAnonymus {
	walletDao?: WalletDAO;
	arweave?: Arweave;
}
export interface ArDriveSettings extends ArDriveSettingsAnonymus {
	wallet: Wallet;
	priceEstimator?: ARDataPriceEstimator;
	feeMultiple?: FeeMultiple;
	dryRun?: boolean;
}

export function arDriveFactory(settings?: ArDriveSettingsAnonymus): ArDriveAnonymous;
export function arDriveFactory(settings: ArDriveSettings): ArDrive;
export function arDriveFactory(s?: ArDriveSettingsAnonymus): ArDrive | ArDriveAnonymous {
	const settings = s as ArDriveSettings;
	const arweave = settings.arweave || cliArweave;
	const walletDao = settings.walletDao || cliWalletDao;
	const priceEstimator = settings.priceEstimator || new ARDataPriceRegressionEstimator();
	if (s && settings.wallet) {
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
	} else {
		return new ArDriveAnonymous(new ArFSDAOAnonymous(arweave, CLI_APP_NAME, CLI_APP_VERSION));
	}
}

// return new ArDriveAnonymous(new ArFSDAOAnonymous(arweave, CLI_APP_NAME, CLI_APP_VERSION));
