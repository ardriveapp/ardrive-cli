import { expect } from 'chai';
import { FeeMultiple } from './';

describe('FeeMultiple class', () => {
	describe('constructor', () => {
		it('constructs valid FeeMultiples given healthy inputs', () => {
			const feeMultiples = [1.0, 1.1, Number.MAX_SAFE_INTEGER];
			feeMultiples.forEach((feeMultiple) => expect(() => new FeeMultiple(feeMultiple)).to.not.throw(Error));
		});

		it('throws an error when provided invalid inputs', () => {
			const feeMultiples = [0, 0.999999999999, -1.0, Number.POSITIVE_INFINITY, Number.NaN];
			feeMultiples.forEach((feeMultiple) =>
				expect(() => new FeeMultiple(feeMultiple), `${feeMultiple} should throw`).to.throw(Error)
			);
		});
	});

	describe('toPrimitive function', () => {
		it('returns the correct FeeMultiple string when hint is string', () => {
			const feeMultiple = new FeeMultiple(2.5);
			expect(`${feeMultiple}`).to.equal('2.5');
		});

		it('returns the correct FeeMultiple string when hint is number', () => {
			// TODO: very big numbers and long decimals
			const feeMultiple = new FeeMultiple(2.5);
			expect(+feeMultiple).to.equal(2.5);
		});
	});

	describe('toString function', () => {
		it('returns the correct FeeMultiple string', () => {
			const feeMultiple = new FeeMultiple(2.123456789);
			expect(feeMultiple.toString()).to.equal('2.123456789');
		});

		it('returns rounded FeeMultiple strings when precision is excessive', () => {
			const feeMultipleRoundDown = new FeeMultiple(2.000000000000000000000000000000001);
			expect(`${feeMultipleRoundDown}`).to.equal('2');

			const feeMultipleRoundUp = new FeeMultiple(0.999999999999999999999999999);
			expect(`${feeMultipleRoundUp}`).to.equal('1');
		});
	});

	describe('valueOf function', () => {
		it('returns the correct FeeMultiple number value', () => {
			const feeMultiple = new FeeMultiple(2.123456789);
			expect(feeMultiple.valueOf()).to.equal(2.123456789);
		});
	});

	describe('wouldBoostReward function', () => {
		it('returns true when the FeeMultiple > 1.0', () => {
			const feeMultiple = new FeeMultiple(1.0001);
			expect(feeMultiple.wouldBoostReward()).to.be.true;
		});

		it('returns false when the FeeMultiple equals 1.0', () => {
			const feeMultiple = new FeeMultiple(1);
			expect(feeMultiple.wouldBoostReward()).to.be.false;
		});
	});

	describe('boostReward function', () => {
		it('boosts an input reward and rounds up', () => {
			const feeMultiple = new FeeMultiple(1.56789);
			expect(feeMultiple.boostReward('3')).to.equal('5');
		});

		it('can boost large rewards', () => {
			const feeMultiple = new FeeMultiple(2);
			expect(feeMultiple.boostReward(`${Number.MAX_SAFE_INTEGER}`)).to.equal('18014398509481982');
		});
	});
});
