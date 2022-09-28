import { expect } from 'chai';
import HeightRange from './height_range';
import { Range } from './range';

describe('HeightRange class', () => {
	it('throws if fed with non positive integers', () => {
		expect(() => new HeightRange([new Range(0.5, 1)])).to.throw('The start must be a positive integer');
		expect(() => new HeightRange([new Range(-1, 0)])).to.throw('The start must be a positive integer');
		expect(() => new HeightRange([new Range(0, 0.6)])).to.throw('The end must be a positive integer');
	});

	it('can be constructed with healthy inputs', () => {
		const validRanges = [new Range(0, 0), new Range(0, 100), new Range(50, 200), new Range(0, 1)];
		for (const range of validRanges) {
			const heightRange = new HeightRange([range]);
			expect(heightRange.rangeSegments.length).to.equal(1);
			expect(heightRange.rangeSegments[0]).to.equal(range);
		}
	});

	describe('difference method', () => {
		const expectations = [
			{
				description: 'returns two ranges if B is included in A, but A is not in B',
				input: { A: new HeightRange([new Range(0, 100)]), B: new HeightRange([new Range(50, 50)]) },
				result: new HeightRange([new Range(0, 49), new Range(51, 100)])
			},
			{
				description: 'returns an empty array if B contains A',
				input: {
					A: new HeightRange([new Range(0, 100)]),
					B: new HeightRange([new Range(0, 50), new Range(51, 100)])
				},
				result: new HeightRange([])
			},
			{
				description: "returns A if the ranges don't overlap",
				input: { A: new HeightRange([new Range(0, 100)]), B: new HeightRange([]) },
				result: new HeightRange([new Range(0, 100)])
			},
			{
				description: 'returns a single range if B intersects A',
				input: {
					A: new HeightRange([new Range(0, 100)]),
					B: new HeightRange([new Range(0, 50), new Range(99, 2000)])
				},
				result: new HeightRange([new Range(51, 98)])
			},
			{
				description: 'returns an empty range if all sub-ranges of B are shadowed by A',
				input: {
					A: new HeightRange([new Range(0, 0), new Range(100, 101)]),
					B: new HeightRange([new Range(0, 50), new Range(99, 2000)])
				},
				result: new HeightRange([])
			}
		];

		for (const expectation of expectations) {
			it(expectation.description, () => {
				const A = expectation.input.A;
				const B = expectation.input.B;
				const diff = HeightRange.difference(A, B);
				diff.rangeSegments.forEach((range, index) => {
					const expectedValue = expectation.result.rangeSegments[index];
					expect(range).to.deep.equal(expectedValue);
				});
			});
		}
	});

	describe('union method', () => {
		it("preserves the amount of sub-ranges if those don't intersect", () => {
			const A = new HeightRange([new Range(0, 25)]);
			const B = new HeightRange([new Range(50, 100), new Range(150, 200)]);
			const union = HeightRange.union(A, B);

			expect(union.rangeSegments.length).to.equal(3);
			expect(union.rangeSegments).to.contain(A.rangeSegments[0]);
			expect(union.rangeSegments).to.contain(B.rangeSegments[0]);
			expect(union.rangeSegments).to.contain(B.rangeSegments[1]);
		});

		it('returns a single sub-range if all of them intersect', () => {
			const A = new HeightRange([new Range(0, 200)]);
			const B = new HeightRange([new Range(50, 100), new Range(150, 250)]);
			const union = HeightRange.union(A, B);

			expect(union.rangeSegments.length).to.equal(1);
			expect(union.rangeSegments[0]).to.deep.equal(new Range(0, 250));
		});

		it('returns more than 1 and less than the total if some of them intersect', () => {
			const A = new HeightRange([new Range(0, 25)]);
			const B = new HeightRange([new Range(50, 100), new Range(150, 200)]);
			const union = HeightRange.union(A, B);

			expect(union.rangeSegments.length).to.equal(3);
			expect(union.rangeSegments[0]).to.deep.equal(A.rangeSegments[0]);
			expect(union.rangeSegments[1]).to.deep.equal(B.rangeSegments[0]);
			expect(union.rangeSegments[2]).to.deep.equal(B.rangeSegments[1]);
		});
	});
});
