import { fetchMempool, GQLEdgeInterface, TransactionID, TxID } from 'ardrive-core-js';
import { cliArweave } from '..';
import { CLICommand, ParametersHelper } from '../CLICommand';
import { CLIAction } from '../CLICommand/action';
import { ERROR_EXIT_CODE, SUCCESS_EXIT_CODE } from '../CLICommand/error_codes';
import { ConfirmationsParameter, TransactionIdParameter } from '../parameter_declarations';

const MIN_CONFIRMATIONS = 15;
const graphQLURL = 'https://arweave.net/graphql';

new CLICommand({
	name: 'tx-status',
	parameters: [TransactionIdParameter, ConfirmationsParameter],
	action: new CLIAction(async function action(options) {
		const parameters = new ParametersHelper(options);
		const confirmations = parameters.getParameterValue<number>(ConfirmationsParameter, Number) ?? MIN_CONFIRMATIONS;
		const txId = parameters.getRequiredParameterValue(TransactionIdParameter, TxID);
		const output: Record<string, string | number> = {
			txId: `${txId}`
		};

		// Check the mempool to see if it's pending
		const transactionsInMempool = (await fetchMempool()).map((id) => new TransactionID(id));
		const pending = transactionsInMempool.some((tx) => tx.equals(txId));
		if (pending) {
			output['status'] = 'Pending';
			console.log(output, null, 4);
			return SUCCESS_EXIT_CODE;
		}

		// Check for a bundled tx
		const queryResponse = await cliArweave.api.post(graphQLURL, {
			query: `
				query {
					transactions(ids: ["${txId}"]) {
						edges {
							node {
								block{
									height
								}
								bundledIn{
									id
								}
								id
							}
						}
					}
				}`
		});

		const edges: GQLEdgeInterface[] = queryResponse.data.data.transactions.edges;
		if (!edges.length) {
			output['status'] = 'Not Found';
			console.log(JSON.stringify(output, null, 4));
			return ERROR_EXIT_CODE;
		}

		const bundledInTx = (edges[0].node as Record<string, any>)['bundledIn']?.id as string;
		if (bundledInTx) {
			output['bundleTxId'] = bundledInTx;
		}

		output['status'] = 'Confirming';
		const txHeight = edges[0].node.block.height;
		if (txHeight) {
			if (txHeight >= confirmations) {
				output['status'] = 'Mined';
				output['height'] = txHeight;
			}

			// Get the current block height so we can compute confirmations
			const rootRsp = await cliArweave.api.get('https://arweave.net/');
			const currHeight = rootRsp.data.height;
			output['confirmations'] = currHeight - txHeight;
		}

		console.log(JSON.stringify(output, null, 4));

		return SUCCESS_EXIT_CODE;
	})
});
