import { expect } from 'chai';
import { ByteCount } from './';

describe('ByteCount class', () => {
	describe('constructor', () => {
		it('constructs valid ByteCounts given healthy inputs', () => {
			const byteCountInputs = [0, 1, Number.MAX_SAFE_INTEGER];
			byteCountInputs.forEach((byteCount) => expect(() => new ByteCount(byteCount)).to.not.throw(Error));
		});

		it('throws an error when provided invalid inputs', () => {
			const byteCountInputs = [-1, 0.5, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NaN];
			byteCountInputs.forEach((byteCount) =>
				expect(() => new ByteCount(byteCount), `${byteCount} should throw`).to.throw(Error)
			);
		});
	});

	describe('toPrimitive function', () => {
		it('returns the correct ByteCount string when hint is string', () => {
			const byteCount = new ByteCount(12345);
			expect(`${byteCount}`).to.equal('12345');
		});

		it('returns the correct ByteCount number when hint is number', () => {
			const byteCount = new ByteCount(12345);
			expect(+byteCount).to.equal(12345);
		});
	});

	describe('toString function', () => {
		it('returns the correct ByteCount string', () => {
			const byteCount = new ByteCount(12345);
			expect(byteCount.toString()).to.equal('12345');
		});
	});

	describe('valueOf function', () => {
		it('returns the correct ByteCount number value', () => {
			const eid = new ByteCount(12345);
			expect(eid.valueOf()).to.equal(12345);
		});
	});

	describe('equals function', () => {
		it('correctly evaluates equality', () => {
			const bc1 = new ByteCount(12345);
			const bc2 = new ByteCount(12345);
			const bc3 = new ByteCount(0);
			expect(bc1.equals(bc2), `${bc1} and ${bc2}`).to.be.true;
			expect(bc2.equals(bc1), `${bc2} and ${bc1}`).to.be.true;
			expect(bc1.equals(bc3), `${bc1} and ${bc3}`).to.be.false;
			expect(bc3.equals(bc1), `${bc3} and ${bc1}`).to.be.false;
			expect(bc2.equals(bc3), `${bc2} and ${bc3}`).to.be.false;
			expect(bc3.equals(bc2), `${bc3} and ${bc2}`).to.be.false;
		});
	});

	describe('toJSON function', () => {
		it('returns the correct JSON value', () => {
			const byteCount = new ByteCount(12345);
			expect(byteCount.toJSON()).to.equal(12345);
		});
	});
});
