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

	public static difference(r_1: Range, r_2: Range): Range[] {
		const start_1 = r_1.start;
		const start_2 = r_2.start;
		const end_1 = r_1.end;
		const end_2 = r_2.end;

		if (start_2 <= start_1 && end_2 >= end_1) {
			// r_1 is included in r_2
			return [];
		}

		const startOfR_2FallsInR_1 = start_2 >= start_1 && end_1 >= start_2;
		const endOfR_2FallsInR_1 = end_2 <= end_1 && start_1 <= end_2;
		const somePointOfR_2FallsInR_1 = startOfR_2FallsInR_1 || endOfR_2FallsInR_1;
		if (somePointOfR_2FallsInR_1) {
			const diff: Range[] = [];
			if (startOfR_2FallsInR_1 && endOfR_2FallsInR_1) {
				// r_2 is included in r_1
				if (start_1 !== start_2) {
					const start_aux = start_1;
					const end_aux = start_2 - 1;
					diff.push(new Range(start_aux, end_aux));
				}
				if (end_1 !== end_2) {
					const start_aux = end_2 + 1;
					const end_aux = end_1;
					diff.push(new Range(start_aux, end_aux));
				}
			} else if (startOfR_2FallsInR_1) {
				// the start of r_2 falls in r_1, but the end doesn't
				if (start_1 !== start_2) {
					const start_aux = start_1;
					const end_aux = start_2 - 1;
					diff.push(new Range(start_aux, end_aux));
				}
			} else {
				// the end of r_2 falls in r_1, but the start doesn't
				if (end_1 !== end_2) {
					const start_aux = end_2 + 1;
					const end_aux = end_1;
					diff.push(new Range(start_aux, end_aux));
				}
			}
			return diff;
		}

		// ranges don't overlap
		return [r_1];
	}
}
