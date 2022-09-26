import { ArweaveAddress, EntityID, GQLNodeInterface } from 'ardrive-core-js';
import { SnapshotData } from './snapshot_types';

export class Snapshots {
	private owner: ArweaveAddress;

	constructor(owner: ArweaveAddress) {
		this.owner = owner;
	}

	/**
	 * Lists all GQL Nodes of all Snapshot items for the given owner
	 */
	public listAll(): Promise<GQLNodeInterface[]> {
		throw new Error('Unimplemented');
	}

	/**
	 * Lists all GQL Nodes of all Snapshot items for the given Drive
	 * @param driveId the desired Drive ID
	 */
	public listForDriveId(driveId: EntityID): Promise<GQLNodeInterface[]> {
		throw new Error('Unimplemented');
	}

	public getDataForDriveId(driveId: EntityID): Promise<SnapshotData[]> {
		throw new Error('Unimplemented');
	}
}
