import { walletDao } from '..';
import { CLICommand } from '../CLICommand';

/* eslint-disable no-console */

new CLICommand({
	name: 'generate-seedphrase',
	parameters: [],
	async action() {
		const seedPhrase = await walletDao.generateSeedPhrase();
		console.log(JSON.stringify(seedPhrase));
		process.exit(0);
	}
});
