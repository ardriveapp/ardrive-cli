import { expect } from 'chai';
import { UnixTime } from './';

describe('UnixTime class', () => {
	describe('constructor', () => {
		it('constructs valid UnixTimes given healthy inputs', () => {
			const unixTimeInputs = [0, 1, Number.MAX_SAFE_INTEGER];
			unixTimeInputs.forEach((unixTime) => expect(() => new UnixTime(unixTime)).to.not.throw(Error));
		});

		it('throws an error when provided invalid inputs', () => {
			const unixTimeInputs = [-1, 0.5, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NaN];
			unixTimeInputs.forEach((unixTime) =>
				expect(() => new UnixTime(unixTime), `${unixTime} should throw`).to.throw(Error)
			);
		});
	});

	describe('toPrimitive function', () => {
		it('returns the correct UnixTime string when hint is string', () => {
			const unixTime = new UnixTime(12345);
			expect(`${unixTime}`).to.equal('12345');
		});

		it('returns the correct UnixTime number when hint is number', () => {
			const unixTime = new UnixTime(12345);
			expect(+unixTime).to.equal(12345);
		});
	});

	describe('toString function', () => {
		it('returns the correct UnixTime string', () => {
			const unixTime = new UnixTime(12345);
			expect(unixTime.toString()).to.equal('12345');
		});
	});

	describe('valueOf function', () => {
		it('returns the correct UnixTime number value', () => {
			const eid = new UnixTime(12345);
			expect(eid.valueOf()).to.equal(12345);
		});
	});

	describe('toJSON function', () => {
		it('returns the correct JSON value', () => {
			const unixTime = new UnixTime(12345);
			expect(unixTime.toJSON()).to.equal(12345);
		});
	});
});
