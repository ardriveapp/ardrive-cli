import { GQLNodeInterface } from 'ardrive-core-js';
import { HeightRange, Range } from '../height_range';

export class SnapshotItem {
	public readonly node: GQLNodeInterface;
	public readonly validSubRange: HeightRange;

	constructor(args: SnapshotItemParams) {
		this.node = args.node;
		const tags = this.node.tags;
		const heightStart = tags.find((tag) => tag.name === 'Block-Start')?.value;
		const heightEnd = tags.find((tag) => tag.name === 'Block-End')?.value;

		this.validSubRange = HeightRange.difference(
			new HeightRange([new Range(+heightStart!, +heightEnd!)]),
			args.obscuredBy
		);
	}
}

interface SnapshotItemParams {
	node: GQLNodeInterface;
	obscuredBy: HeightRange;
}

export interface SnapshotData {
	// sorted in **GQL order**
	entities: EntitySnapshot[]; // contains revisions as well
}

export interface EntitySnapshot {
	gqlNode: GQLNodeInterface;
	jsonMetadata: string;
}
