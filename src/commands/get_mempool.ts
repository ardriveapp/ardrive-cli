import { CLICommand } from '../CLICommand';
import { SUCCES_EXIT_CODE } from '../CLICommand/constants';
import { fetchMempool } from '../utils';

new CLICommand({
	name: 'get-mempool',
	parameters: [],
	async action() {
		const transactionsInMempool = await fetchMempool();
		console.log(JSON.stringify(transactionsInMempool, null, 4));
		return SUCCES_EXIT_CODE;
	}
});
