import { CLICommand } from '../CLICommand';
import { fetchMempool } from '../utils';

new CLICommand({
	name: 'get-mempool',
	parameters: [],
	async action() {
		const transactionsInMempool = await fetchMempool();
		console.log(JSON.stringify(transactionsInMempool, null, 4));
		process.exit(0);
	}
});
