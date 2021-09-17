import { walletDao } from '..';
import { CLICommand } from '../CLICommand';
import { SeedPhraseParameter } from '../parameter_declarations';

/* eslint-disable no-console */

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
