import {
	ArFSPublicFileDataPrototype,
	ArFSPublicFileDataTransactionData,
	ArweaveAddress,
	DESCENDING_ORDER,
	DriveID,
	GatewayAPI,
	GQLEdgeInterface,
	RewardSettings,
	TransactionID,
	TxID
} from 'ardrive-core-js';
import { MultiChunkTxUploader } from 'ardrive-core-js/lib/arfs/multi_chunk_tx_uploader';
import { TxPreparer } from 'ardrive-core-js/lib/arfs/tx/tx_preparer';
import { HeightRange, Range } from '../height_range';
import { buildQuery } from '../query';
import { SnapshotData, TxSnapshot } from './snapshot_types';

export async function postSnapshot({
	snapshot,
	gatewayApi,
	txPreparer,
	rewardSettings
}: CreateSnapshotParams): Promise<void> {
	const data = snapshotDataToBuffer(snapshot.data);

	const objectData = new ArFSPublicFileDataTransactionData(data);
	const publicFileDataProto = new ArFSPublicFileDataPrototype(objectData, 'application/json', {
		'Entity-Type': 'snapshot'
	});
	const transaction = await txPreparer.prepareFileDataTx({ objectMetaData: publicFileDataProto, rewardSettings });

	const uploader = new MultiChunkTxUploader({ gatewayApi, transaction });
	await uploader.batchUploadChunks();
}

export function snapshotDataToBuffer(snapshot: SnapshotData): Buffer {
	return Buffer.from(JSON.stringify(snapshot));
}

export async function constructSnapshotData({
	owner,
	driveId,
	gatewayApi
}: GetSnapshotDataParams): Promise<GetSnapshotDataResult> {
	const txs = await queryAllTxsForDrive({ owner, driveId, gatewayApi });
	const txSnapshots: TxSnapshot[] = await Promise.all(
		txs.map(
			async ({ node }) =>
				<TxSnapshot>{
					gqlNode: node,
					jsonMetadata: await getDataForTxIDAsString({ txId: TxID(node.id), gatewayApi })
				}
		)
	);
	const data: SnapshotData = {
		txSnapshots
	};

	// TODO: use the ranges passed to the parameters if present
	const rangeStart = txs[txs.length - 1].node.block.height;
	const rangeEnd = txs[0].node.block.height;
	const queriedRange: HeightRange = new HeightRange([new Range(rangeStart, rangeEnd)]);

	return { data, range: queriedRange };
}

/**
 * Queries for all MetaData TXs of certain drive
 */
export async function queryAllTxsForDrive({ owner, driveId, gatewayApi }: QueryAllParams): Promise<GQLEdgeInterface[]> {
	// TODO: let me take a range of blocks to query for

	const edges: GQLEdgeInterface[] = [];
	let hasNextPage = true;
	let cursor = '';
	while (hasNextPage) {
		const query = buildQuery({
			owner,
			sort: DESCENDING_ORDER,
			tags: [{ name: 'Drive-Id', value: `${driveId}` }],
			cursor
		});
		const transactions = await gatewayApi.gqlRequest(query);
		cursor = transactions.edges[transactions.edges.length - 1].cursor;
		hasNextPage = transactions.pageInfo.hasNextPage;
		edges.push(...transactions.edges);
	}

	// console.log(`Query result: ${JSON.stringify(result.data, null, 4)}`);

	return edges;
}

export async function getDataForTxIDAsString({ txId, gatewayApi }: GetDataParams): Promise<string> {
	return (await getDataForTxID({ txId, gatewayApi })).toString();
}

export async function getDataForTxID({ txId, gatewayApi }: GetDataParams): Promise<Buffer> {
	return gatewayApi.getTxData(txId);
}

// type CreateSnapshotParams = GetSnapshotDataParams;
type GetSnapshotDataParams = QueryAllParams;

interface QueryAllParams {
	owner: ArweaveAddress;
	driveId: DriveID;
	gatewayApi: GatewayAPI;
	block?: {
		min?: number;
		max?: number;
	};
}

interface GetDataParams {
	txId: TransactionID;
	gatewayApi: GatewayAPI;
}

export interface GetSnapshotDataResult {
	data: SnapshotData;
	range: HeightRange;
}

interface CreateSnapshotParams {
	snapshot: GetSnapshotDataResult;
	txPreparer: TxPreparer;
	gatewayApi: GatewayAPI;
	rewardSettings: RewardSettings;
}
