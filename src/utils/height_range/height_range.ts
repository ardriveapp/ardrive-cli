import { Range } from './range';

export class HeightRange {
	public readonly rangeSegments;

	constructor(rangeSegments: Range[]) {
		for (const range of rangeSegments) {
			const { start, end } = range;
			if (!(Number.isInteger(start) && start >= 0)) {
				throw new Error('The start must be a positive integer');
			}
			if (!(Number.isInteger(end) && end >= 0)) {
				throw new Error('The end must be a positive integer');
			}
		}
		this.rangeSegments = rangeSegments;
	}

	public static difference(r_1: HeightRange, r_2: HeightRange): HeightRange {
		let prevDiff: Range[] = r_1.rangeSegments;
		for (const range_2 of r_2.rangeSegments) {
			const currDiff: Range[] = [];
			for (const range_1 of prevDiff) {
				currDiff.push(...Range.difference(range_1, range_2));
			}
			prevDiff = currDiff;
		}
		const diff = prevDiff;
		return new HeightRange(diff);
	}

	public static union(r_1: HeightRange, r_2: HeightRange): HeightRange {
		const mixedRanges = [...r_1.rangeSegments, ...r_2.rangeSegments];
		const normalizedRanges = this.normalizeSegments(mixedRanges);
		const union = new HeightRange(normalizedRanges);
		return union;
	}

	private static normalizeSegments(rangeSegments: Range[]): Range[] {
		// TODO: implement me!
		return rangeSegments;
	}
}

export default HeightRange;
