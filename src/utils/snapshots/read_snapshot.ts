import { ArweaveAddress, buildQuery, DESCENDING_ORDER, GQLEdgeInterface } from 'ardrive-core-js';
import { cliArweave } from '../..';
import { HeightRange } from '../height_range';
import { SnapshotItem } from './snapshot_types';

export async function getAllSnapshotItems(args: queryAllParams): Promise<SnapshotItem[]> {
	let obscuredBy = new HeightRange([]);
	const gqlEdges = await queryAllSnapshots(args);
	return gqlEdges.map((edge) => {
		const node = edge.node;
		const item = new SnapshotItem({ gqlNode: node, obscuredBy });
		obscuredBy = HeightRange.union(obscuredBy, item.validSubRange);
		return item;
	});
}

// TODO: make me work with Streams (json-stream)
export async function queryAllSnapshots(args: queryAllParams): Promise<GQLEdgeInterface[]> {
	const owner = args.owner;

	const query = buildQuery({
		owner,
		// DESC_ORDER because newer TXs will obscure previous ones
		sort: DESCENDING_ORDER,
		tags: [{ name: 'Entity-Type', value: 'snapshot' }]
	});
	const result = await cliArweave.api.get('graphql', { data: query });
	return result.data.transactions.edges as GQLEdgeInterface[];
}

interface queryAllParams {
	owner: ArweaveAddress;
}
