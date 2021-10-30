import { CLICommand } from '../CLICommand';
import { CLIAction } from '../CLICommand/action';
import { SUCCESS_EXIT_CODE } from '../CLICommand/error_codes';
import { fetchMempool } from '../utils';

new CLICommand({
	name: 'get-mempool',
	parameters: [],
	action: new CLIAction(async function action() {
		const transactionsInMempool = await fetchMempool();
		console.log(JSON.stringify(transactionsInMempool, null, 4));
		return SUCCESS_EXIT_CODE;
	})
});
