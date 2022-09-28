export class Range {
	static readonly nullRange = new Range(-1, -1);

	public readonly start: number;
	public readonly end: number;

	constructor(start: number, end: number) {
		if (start > end) {
			throw new Error(`The end can't be before the start: ${start}, ${end}`);
		}

		this.start = start;
		this.end = end;
	}

	public static intersection(r_1: Range, r_2: Range): Range | undefined {
		const start_1 = r_1.start;
		const start_2 = r_2.start;
		const end_1 = r_1.end;
		const end_2 = r_2.end;

		const startOfR_2FallsInR_1 = start_2 >= start_1 && end_1 >= start_2;
		const endOfR_2FallsInR_1 = end_2 <= end_1 && start_1 <= end_2;
		const somePointOfR_2FallsInR_1 = startOfR_2FallsInR_1 || endOfR_2FallsInR_1;
		const r_1IsFullyIncludedInR_2 = start_1 > start_2 && end_1 < end_2;
		if (somePointOfR_2FallsInR_1) {
			// the ranges does intersect
			const intersectionStart = Math.max(start_1, start_2); // the greater start
			const intersectionEnd = Math.min(end_1, end_2); // the smaller end
			return new Range(intersectionStart, intersectionEnd);
		} else if (r_1IsFullyIncludedInR_2) {
			return r_1;
		}

		// the ranges don't intersect
		return;
	}

	public static difference(r_1: Range, r_2: Range): Range[] {
		const intersection = Range.intersection(r_1, r_2);

		if (intersection) {
			const startMatches = intersection.start === r_1.start;
			const endMatches = intersection.end === r_1.end;
			if (startMatches && endMatches) {
				// r_1 is fully included in r_2, the diff is void
				return [];
			} else if (startMatches) {
				// the intersection matches the start of r_1; the difference is at the end
				const diff = new Range(intersection.end + 1, r_1.end);
				return [diff];
			} else if (endMatches) {
				// the intersection matches the end of r_1; the difference is at the start
				const diff = new Range(r_1.start, intersection.start - 1);
				return [diff];
			} else {
				// neither of the limits matches, r_2 is included in r_1; the difference is at the start and end
				const diffStart = new Range(r_1.start, intersection.start - 1);
				const diffEnd = new Range(intersection.end + 1, r_1.end);
				return [diffStart, diffEnd];
			}
		}

		// ranges don't intersect, the difference is the whole r_1
		return [r_1];
	}

	public toString(): string {
		return `Range [${this.start}, ${this.end}]`;
	}
}
