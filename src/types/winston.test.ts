import { expect } from 'chai';
import { Winston } from './winston';

describe('Winston class', () => {
	describe('constructor', () => {
		it('constructor throws an exception when a negative Winston value is provided', () => {
			expect(() => new Winston(-1)).to.throw(Error);
			expect(() => new Winston('-1')).to.throw(Error);
		});

		it('constructor throws an exception when a non-integer Winston value is provided', () => {
			expect(() => new Winston(0.5)).to.throw(Error);
			expect(() => new Winston('0.5')).to.throw(Error);
		});

		it('constructor builds Winston values for positive integer number values without throwing an error', () => {
			expect(() => new Winston(0)).to.not.throw(Error);
			expect(() => new Winston(1)).to.not.throw(Error);
			expect(() => new Winston(Number.MAX_SAFE_INTEGER)).to.not.throw(Error);
		});

		// Not concerned with other number notations for now, e.g. scientific notation
		it('constructor builds Winston values for positive integer strings without throwing an error', () => {
			expect(() => new Winston('0')).to.not.throw(Error);
			expect(() => new Winston('1')).to.not.throw(Error);
		});

		it('constructor builds Winston values for positive BigNumber integer strings', () => {
			expect(() => new Winston('18014398509481982')).to.not.throw(Error);
		});
	});

	describe('plus function', () => {
		it('correctly sums up Winston values', () => {
			expect(new Winston(1).plus(new Winston(2)).toString()).to.equal('3');
		});

		it('correctly sums up Winston values in the BigNumber ranges', () => {
			expect(new Winston(Number.MAX_SAFE_INTEGER).plus(new Winston(Number.MAX_SAFE_INTEGER)).toString()).to.equal(
				'18014398509481982'
			);
		});
	});

	describe('minus function', () => {
		it('correctly subtracts Winston values', () => {
			expect(new Winston(2).minus(new Winston(1)).toString()).to.equal('1');
		});

		it('correctly subtracts Winston values in the BigNumber ranges', () => {
			expect(new Winston('18014398509481982').minus(new Winston(Number.MAX_SAFE_INTEGER)).toString()).to.equal(
				'9007199254740991'
			);
		});

		it('throws an error when the subtraction result is less than 0', () => {
			expect(() => new Winston(1).minus(new Winston(2))).to.throw(Error);
		});
	});

	describe('times function', () => {
		it('correctly multiplies Winston values by whole and fractional numbres', () => {
			expect(new Winston(2).times(3).toString()).to.equal('6');
			expect(new Winston(2).times(1.5).toString()).to.equal('3');
		});

		it('correctly multiplies Winston values by whole and fractional BigNumbers', () => {
			expect(new Winston(2).times(Number.MAX_SAFE_INTEGER).toString()).to.equal('18014398509481982');
			expect(new Winston(2).times('18014398509481982').toString()).to.equal('36028797018963964');
		});

		it('rounds down multiplications that result in fractional numbers', () => {
			expect(new Winston(2).times(1.6).toString()).to.equal('3');
			expect(new Winston(Number.MAX_SAFE_INTEGER).times(1.5).toString()).to.equal('13510798882111486');
		});

		it('throws an error when the multiplying by negative numbers', () => {
			expect(() => new Winston(1).times(-1)).to.throw(Error);
		});
	});

	describe('dividedBy function', () => {
		it('correctly divides Winston values by whole and fractional numbres', () => {
			expect(new Winston(6).dividedBy(3).toString()).to.equal('2');
			expect(new Winston(6).dividedBy(1.5).toString()).to.equal('4');
		});

		it('correctly divides Winston values by whole and fractional BigNumbers', () => {
			expect(new Winston('18014398509481982').dividedBy(Number.MAX_SAFE_INTEGER).toString()).to.equal('2');
			expect(new Winston('36028797018963965').dividedBy('18014398509481982.5').toString()).to.equal('2');
		});

		it('rounds up divisions that result in fractional numbers', () => {
			expect(new Winston(3).dividedBy(2).toString()).to.equal('2');
			expect(new Winston('13510798882111487').dividedBy(2).toString()).to.equal('6755399441055744');
		});

		it('throws an error when dividing by negative numbers', () => {
			expect(() => new Winston(1).dividedBy(-1)).to.throw(Error);
		});
	});

	describe('isGreaterThan function', () => {
		it('returns false when other Winston is greater', () => {
			expect(new Winston(1).isGreaterThan(new Winston(2))).to.be.false;
		});

		it('returns true when other Winston is lesser', () => {
			expect(new Winston(2).isGreaterThan(new Winston(1))).to.be.true;
		});

		it('returns false when other Winston is equal', () => {
			expect(new Winston(2).isGreaterThan(new Winston(2))).to.be.false;
		});
	});

	describe('difference function', () => {
		it('can return a positive difference between Winstons', () => {
			expect(Winston.difference(new Winston(2), new Winston(1))).to.equal('1');
		});

		it('can return a negative difference between Winstons', () => {
			expect(Winston.difference(new Winston(1), new Winston(2))).to.equal('-1');
		});
	});

	describe('toString function', () => {
		it('returns the Winston value as a BigNumber string', () => {
			expect(new Winston(0).toString()).to.equal('0');
			expect(new Winston(1).toString()).to.equal('1');
			expect(new Winston('18014398509481982').toString()).to.equal('18014398509481982');
		});
	});

	describe('valueOf function', () => {
		it('returns the Winston value as a BigNumber string', () => {
			expect(new Winston(0).valueOf()).to.equal('0');
			expect(new Winston(1).valueOf()).to.equal('1');
			expect(new Winston('18014398509481982').valueOf()).to.equal('18014398509481982');
		});
	});

	describe('max function', () => {
		it('correctly computes the max Winston value from an aritrarily large list of Winston values', () => {
			expect(
				`${Winston.max(
					new Winston('18014398509481982'),
					new Winston(Number.MAX_SAFE_INTEGER),
					new Winston(1),
					new Winston(0)
				)}`
			).to.equal('18014398509481982');
		});
	});
});
