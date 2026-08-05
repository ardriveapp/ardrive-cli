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
 * Builds the JSON-serializable {@link SnapshotData} body for a drive snapshot: the drive's full
 * entity metadata history (every drive/folder/file revision), paired with the block-height range
 * it spans.
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

	const txSnapshots: TxSnapshot[] = await Promise.all(
		edges.map(
			async ({ node }): Promise<TxSnapshot> => {
				const jsonMetadata = (await gatewayApi.getTxData(TxID(node.id))).toString();
				return { gqlNode: node, jsonMetadata };
			}
		)
	);

	const blockHeights = edges
		.map((edge) => edge.node.block?.height)
		.filter((height): height is number => typeof height === 'number');

	if (blockHeights.length === 0) {
		throw new Error(
			`None of the ${edges.length} entity transaction(s) found for drive '${driveId}' have been mined yet -- wait for them to confirm before creating a snapshot.`
		);
	}

	const data: SnapshotData = { txSnapshots };
	const blockStart = Math.min(...blockHeights);
	const blockEnd = Math.max(...blockHeights);

	return { data, blockStart, blockEnd, entityCount: txSnapshots.length };
}

/** Serializes a {@link SnapshotData} body exactly as core-js's `parseSnapshotData` expects to read it back */
export function snapshotDataToBuffer(data: SnapshotData): Buffer {
	return Buffer.from(JSON.stringify(data));
}
