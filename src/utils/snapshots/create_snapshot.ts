import {
	ArweaveAddress,
	DESCENDING_ORDER,
	DriveID,
	GatewayAPI,
	GQLEdgeInterface,
	SnapshotData,
	SnapshotTagName,
	SNAPSHOT_ENTITY_TYPE,
	TxSnapshot,
	TxID,
	buildQuery
} from 'ardrive-core-js';

export interface ConstructSnapshotDataParams {
	/** The drive owner -- snapshots (and the entities they index) are only ever queried owner-scoped */
	owner: ArweaveAddress;
	driveId: DriveID;
	gatewayApi: GatewayAPI;
}

export interface ConstructSnapshotDataResult {
	/** The parsed snapshot body -- shape MUST stay in lockstep with core-js's own `parseSnapshotData` */
	data: SnapshotData;
	/** Lowest block height among the indexed entity transactions (inclusive) */
	blockStart: number;
	/** Highest block height among the indexed entity transactions (inclusive) */
	blockEnd: number;
	/** Number of entity transaction revisions captured in this snapshot */
	entityCount: number;
}

/**
 * Queries every ArFS entity metadata transaction (drive/folder/file, all revisions) belonging to
 * the given drive, owner-scoped and sorted newest-first -- the same owner + `Drive-Id` scoping
 * core-js's own `buildSnapshotQuery` uses for reading snapshots back.
 *
 * Transactions that are themselves PRIOR SNAPSHOTS of this drive are excluded client-side (a
 * snapshot must index entity revisions, never another snapshot -- there is no server-side "NOT"
 * tag filter available to exclude them at the GQL layer).
 */
export async function queryAllDriveEntityTxs({
	owner,
	driveId,
	gatewayApi
}: ConstructSnapshotDataParams): Promise<GQLEdgeInterface[]> {
	const edges: GQLEdgeInterface[] = [];
	let cursor: string | undefined = undefined;
	let hasNextPage = true;

	while (hasNextPage) {
		const query = buildQuery({
			owner,
			sort: DESCENDING_ORDER,
			tags: [{ name: SnapshotTagName.driveId, value: `${driveId}` }],
			cursor
		});

		const { edges: pageEdges, pageInfo } = await gatewayApi.gqlRequest(query);

		for (const edge of pageEdges) {
			const entityTypeTag = edge.node.tags.find((tag) => tag.name === SnapshotTagName.entityType);
			if (entityTypeTag?.value === SNAPSHOT_ENTITY_TYPE) {
				// A previous snapshot of this drive -- never index a snapshot inside another snapshot
				continue;
			}
			edges.push(edge);
		}

		hasNextPage = pageInfo.hasNextPage;
		cursor = pageEdges.length ? pageEdges[pageEdges.length - 1].cursor : undefined;
		if (!cursor) {
			break;
		}
	}

	return edges;
}

/**
 * How many entity-metadata transactions to fetch from the gateway concurrently when building a
 * snapshot body. A large drive can have thousands of entity revisions; fetching them all with an
 * unbounded `Promise.all` opens one gateway request per revision at once, which can exhaust memory
 * or sockets and trip gateway rate limits before the snapshot completes. A small fixed worker pool
 * keeps snapshot creation bounded and gateway-friendly.
 */
export const SNAPSHOT_TX_FETCH_CONCURRENCY = 8;

/**
 * Fetches each edge's `jsonMetadata` with at most {@link SNAPSHOT_TX_FETCH_CONCURRENCY} requests in
 * flight at once (a shared-cursor worker pool), preserving input order in the returned array.
 */
async function fetchTxSnapshotsBounded(
	edges: GQLEdgeInterface[],
	gatewayApi: GatewayAPI,
	concurrency: number = SNAPSHOT_TX_FETCH_CONCURRENCY
): Promise<TxSnapshot[]> {
	const txSnapshots: TxSnapshot[] = new Array(edges.length);
	let nextIndex = 0;

	async function worker(): Promise<void> {
		for (let i = nextIndex++; i < edges.length; i = nextIndex++) {
			const { node } = edges[i];
			const jsonMetadata = (await gatewayApi.getTxData(TxID(node.id))).toString();
			txSnapshots[i] = { gqlNode: node, jsonMetadata };
		}
	}

	const workerCount = Math.min(Math.max(concurrency, 1), edges.length);
	await Promise.all(Array.from({ length: workerCount }, () => worker()));
	return txSnapshots;
}

/**
 * Builds the JSON-serializable {@link SnapshotData} body for a drive snapshot: the drive's mined
 * entity metadata history (every mined drive/folder/file revision), paired with the block-height
 * range it spans.
 *
 * The output shape (`{ txSnapshots: [{ gqlNode, jsonMetadata }, ...] }`) is dictated by core-js's
 * own `parseSnapshotData`/`SnapshotData` types -- this is what makes a snapshot written by this
 * command consumable by core-js's own snapshot-accelerated listing path.
 */
export async function constructSnapshotData({
	owner,
	driveId,
	gatewayApi
}: ConstructSnapshotDataParams): Promise<ConstructSnapshotDataResult> {
	const edges = await queryAllDriveEntityTxs({ owner, driveId, gatewayApi });

	if (edges.length === 0) {
		throw new Error(
			`No entity metadata transactions were found for drive '${driveId}' owned by '${owner}' -- there is nothing to snapshot yet.`
		);
	}

	// Only MINED revisions belong in a snapshot. The snapshot's Block-Start/Block-End tags describe a
	// closed block range; an unmined (pending, no block height) revision would put body content into
	// the snapshot that those tags cannot represent. Filter first, then use the SAME mined set for the
	// body, the block bounds, AND the entity count so all three stay mutually consistent.
	const minedEdges = edges.filter((edge) => typeof edge.node.block?.height === 'number');

	if (minedEdges.length === 0) {
		throw new Error(
			`None of the ${edges.length} entity transaction(s) found for drive '${driveId}' have been mined yet -- wait for them to confirm before creating a snapshot.`
		);
	}

	const txSnapshots = await fetchTxSnapshotsBounded(minedEdges, gatewayApi);

	const blockHeights = minedEdges
		.map((edge) => edge.node.block?.height)
		.filter((height): height is number => typeof height === 'number');

	const data: SnapshotData = { txSnapshots };
	const blockStart = Math.min(...blockHeights);
	const blockEnd = Math.max(...blockHeights);

	return { data, blockStart, blockEnd, entityCount: txSnapshots.length };
}

/** Serializes a {@link SnapshotData} body exactly as core-js's `parseSnapshotData` expects to read it back */
export function snapshotDataToBuffer(data: SnapshotData): Buffer {
	return Buffer.from(JSON.stringify(data));
}
