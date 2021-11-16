import Arweave from 'arweave';
import { CLICommand } from './CLICommand';
import {
	ArDrive,
	ArDriveAnonymous,
	arDriveAnonymousFactory,
	arDriveFactory,
	ArDriveSettings,
	ArDriveSettingsAnonymous,
	WalletDAO
} from 'ardrive-core-js';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: CLI_APP_VERSION } = require('../package.json');

if (require.main === module) {
	// declare all parameters
	import('./parameter_declarations').then(() => {
		// declares the commands
		import('./commands').then(() => {
			try {
				CLICommand.parse();
			} catch {
				// do nothing, commander already logs the error
			}
		});
	});
}

export const CLI_APP_NAME = 'ArDrive-CLI';
export { CLI_APP_VERSION };

// TODO: Make configurable from CLI
export const cliArweave = Arweave.init({
	host: 'arweave.net', // Arweave Gateway
	//host: 'arweave.dev', // Arweave Dev Gateway
	port: 443,
	protocol: 'https',
	timeout: 600000
});

export const cliWalletDao = new WalletDAO(cliArweave, CLI_APP_NAME, CLI_APP_VERSION);

export const cliArDriveFactory = ({
	appName = CLI_APP_NAME,
	appVersion = CLI_APP_VERSION,
	arweave = cliArweave,
	walletDao = cliWalletDao,
	dryRun,
	feeMultiple,
	wallet,
	arfsDao,
	communityOracle,
	priceEstimator
}: ArDriveSettings): ArDrive =>
	arDriveFactory({
		appName,
		appVersion,
		arweave,
		walletDao,
		dryRun,
		feeMultiple,
		wallet,
		arfsDao,
		communityOracle,
		priceEstimator
	});

export const cliArDriveAnonymousFactory = ({
	appName = CLI_APP_NAME,
	appVersion = CLI_APP_VERSION,
	arweave = cliArweave
}: ArDriveSettingsAnonymous): ArDriveAnonymous =>
	arDriveAnonymousFactory({
		appName,
		appVersion,
		arweave
	});
