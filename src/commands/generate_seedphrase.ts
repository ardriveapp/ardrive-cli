import { cliWalletDao } from '..';
import { CLICommand } from '../CLICommand';
import { CLIAction } from '../CLICommand/action';
import { SUCCESS_EXIT_CODE } from '../CLICommand/error_codes';

new CLICommand({
	name: 'generate-seedphrase',
	parameters: [],
	action: new CLIAction(async function action() {
		const seedPhrase = await cliWalletDao.generateSeedPhrase();
		console.log(JSON.stringify(seedPhrase));
		return SUCCESS_EXIT_CODE;
	})
});
