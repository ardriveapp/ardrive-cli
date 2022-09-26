import { expect } from 'chai';
import { Range } from './range';

describe('Range class', () => {
	it('throws if start is greater than end', () => {
		expect(() => new Range(2, 1)).to.throw("The end can't be before the start: 2, 1");
		expect(() => new Range(2, -5)).to.throw("The end can't be before the start: 2, -5");
		expect(() => new Range(-1, -2)).to.throw("The end can't be before the start: -1, -2");
	});

	it('can be constructed with healthy inputs', () => {
		let range = new Range(0, 0);
		expect(range.start).to.equal(0);
		expect(range.end).to.equal(0);

		range = new Range(1, 2);
		expect(range.start).to.equal(1);
		expect(range.end).to.equal(2);

		range = new Range(-2, -1);
		expect(range.start).to.equal(-2);
		expect(range.end).to.equal(-1);

		range = new Range(Math.SQRT2, Math.PI);
		expect(range.start).to.equal(Math.SQRT2);
		expect(range.end).to.equal(Math.PI);
	});

	describe('difference method', () => {
		it('returns an empty array if B contains A', () => {
			let A = new Range(25, 50);
			let B = new Range(0, 100);
			let diff = Range.difference(A, B);
			expect(diff).deep.equal([]);

			A = new Range(25, 50);
			B = new Range(25, 50);
			diff = Range.difference(A, B);
			expect(diff).deep.equal([]);
		});

		it("returns A if the ranges don't overlap", () => {
			const A = new Range(0, 25);
			const B = new Range(50, 100);
			const diff = Range.difference(A, B);
			expect(diff[0]).to.equal(A);
		});

		it('returns two ranges if B is included in A, but A is not in B', () => {
			const A = new Range(0, 100);
			const B = new Range(25, 50);
			const [diff_1, diff_2] = Range.difference(A, B);
			expect(diff_1.start).to.equal(0);
			expect(diff_1.end).to.equal(24);
			expect(diff_2.start).to.equal(51);
			expect(diff_2.end).to.equal(100);
		});

		it('returns a single range if B intersects A', () => {
			let A = new Range(50, 100);
			let B = new Range(75, 200);
			let diff = Range.difference(A, B);
			expect(diff[0].start).to.equal(50);
			expect(diff[0].end).to.equal(74);

			A = new Range(50, 100);
			B = new Range(0, 50);
			diff = Range.difference(A, B);
			expect(diff[0].start).to.equal(51);
			expect(diff[0].end).to.equal(100);
		});
	});
});
