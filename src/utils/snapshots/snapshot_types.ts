import { GQLNodeInterface } from 'ardrive-core-js';
import { HeightRange, Range } from '../height_range';

export class SnapshotItem {
	public readonly node: GQLNodeInterface;
	public readonly validSubRange: HeightRange;

	constructor(args: SnapshotItemParams) {
		this.node = args.gqlNode;
		const tags = this.node.tags;
		const heightStart = tags.find((tag) => tag.name === 'Block-Start')?.value;
		const heightEnd = tags.find((tag) => tag.name === 'Block-End')?.value;

		if (!(heightStart && heightEnd)) {
			throw new Error('The Snapshot transaction must have Block-Start and Block-End GQL tags!');
		}

		this.validSubRange = HeightRange.difference(
			new HeightRange([new Range(+heightStart, +heightEnd)]),
			args.obscuredBy
		);
	}
}

interface SnapshotItemParams {
	gqlNode: GQLNodeInterface;
	obscuredBy: HeightRange;
}

export interface SnapshotData {
	// sorted in **GQL order**
	txSnapshots: TxSnapshot[]; // contains revisions as well
}

export interface TxSnapshot {
	gqlNode: GQLNodeInterface;

	// Should this be a JSON object instead of string?
	jsonMetadata: string;
}
