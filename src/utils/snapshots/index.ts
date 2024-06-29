import { ArweaveAddress, EntityID, GQLNodeInterface } from 'ardrive-core-js';
import { SnapshotData, TxSnapshot } from './snapshot_types';

export class Snapshots {
	private owner: ArweaveAddress;

	constructor(owner: ArweaveAddress) {
		this.owner = owner;
	}

	/**
	 * Transforms the given GQL Nodes data into a SnapshotData item
	 * @param gqlNodes a JSON object returned by GQL representing the nodes of the edge
	 * @param jsonMetadataMap a mapping (txId: jsonMetadata) holding the previously fetched data
	 */
	public async gqlNodesToSnapshotData({
		gqlNodes,
		jsonMetadataMap
	}: GqlNodesToSnapshotDataParams): Promise<SnapshotData> {
		const txSnapshots: TxSnapshot[] = gqlNodes.map((gqlNode) => {
			const txId = gqlNode.id;
			const jsonMetadata = jsonMetadataMap[txId];

			if (!jsonMetadata) {
				// TODO: remove this conditional and fetch the data instead
				throw new Error(`The data for the node with id: ${txId} not provided!`);
			}

			return <TxSnapshot>{ gqlNode, jsonMetadata };
		});

		return <SnapshotData>{ txSnapshots };
	}

	/**
	 * Lists all GQL Nodes of all Snapshot items for the given owner
	 */
	public listAll(): Promise<GQLNodeInterface[]> {
		console.log(`TODO: list all for owner ${this.owner}`);
		throw new Error('Unimplemented');
	}

	/**
	 * Lists all GQL Nodes of all Snapshot items for the given Drive
	 * @param driveId the desired Drive ID
	 */
	public listForDriveId(driveId: EntityID): Promise<GQLNodeInterface[]> {
		console.log(`TODO: list for drive id ${driveId}`);
		throw new Error('Unimplemented');
	}

	public getDataForDriveId(driveId: EntityID): Promise<SnapshotData[]> {
		console.log(`TODO: get all data for drive id ${driveId}`);
		throw new Error('Unimplemented');
	}
}

interface GqlNodesToSnapshotDataParams {
	gqlNodes: GQLNodeInterface[];
	jsonMetadataMap: { [metadataTx: string]: string };
}
