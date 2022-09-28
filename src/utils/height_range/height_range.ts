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
		const normalizedRanges = HeightRange.normalizeSegments(mixedRanges);
		const union = new HeightRange(normalizedRanges);
		return union;
	}

	private static normalizeSegments(rangeSegments: Range[]): Range[] {
		const sortedSegments = rangeSegments.sort((a, b) => a.start - b.start);
		const normalized = sortedSegments.reduce(function (accumulator: Range[], currentRange) {
			const auxiliar = accumulator.slice();
			const previousValue = auxiliar.pop();
			if (!previousValue) {
				auxiliar.push(currentRange);
			} else {
				const union = Range.union(previousValue, currentRange);
				auxiliar.push(...union);
			}
			return auxiliar;
		}, []);
		return normalized;
	}
}

export default HeightRange;
