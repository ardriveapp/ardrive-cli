import { fetchMempool } from 'ardrive-core-js';
import { CLICommand, ParametersHelper } from '../CLICommand';
import { CLIAction } from '../CLICommand/action';
import { SUCCESS_EXIT_CODE } from '../CLICommand/error_codes';
import { GatewayParameter } from '../parameter_declarations';

new CLICommand({
	name: 'get-mempool',
	parameters: [GatewayParameter],
	action: new CLIAction(async function action(options) {
		const parameters = new ParametersHelper(options);
		const gateway = parameters.getGateway();
		const transactionsInMempool = await fetchMempool(gateway);
		console.log(JSON.stringify(transactionsInMempool, null, 4));
		return SUCCESS_EXIT_CODE;
	})
});
