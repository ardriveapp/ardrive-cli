import { cliWalletDao } from '..';
import { CLICommand } from '../CLICommand';
import { SUCCES_EXIT_CODE } from '../CLICommand/constants';

new CLICommand({
	name: 'generate-seedphrase',
	parameters: [],
	async action() {
		const seedPhrase = await cliWalletDao.generateSeedPhrase();
		console.log(JSON.stringify(seedPhrase));
		return SUCCES_EXIT_CODE;
	}
});
