import { expect } from 'chai';
import { assertARPrecision } from './ar_unit';

describe('The assertARPrecision method', () => {
	const VALID_INTEGER = '1';
	const VALID_FLOATING_POINT = '0.0';
	const VALID_FLOATING_POINT_NO_LEADING_DIGITS = '.0123';
	const VALID_FLOATING_POINT_WITH_TRAILING_ZEROS = '.00000000000100000000000000000';
	const EXCESSIVE_NONZERO_DIGITS = '.000000000001010';
	const A_HALF_A_WINSTON = '.0000000000005';
	const NOT_A_NUMBER = 'not a number >:b .00000';
	const NEGATIVE_VALUE = '-10';

	it('Passes when asserting an integer', () => {
		expect(assertARPrecision.bind(this, VALID_INTEGER)).to.not.throw();
	});

	it('Passes when asserting a floating point', () => {
		expect(assertARPrecision.bind(this, VALID_FLOATING_POINT)).to.not.throw();
	});

	it('Passes when asserting a floating point with no leading digits', () => {
		expect(assertARPrecision.bind(this, VALID_FLOATING_POINT_NO_LEADING_DIGITS)).to.not.throw();
	});

	it('Passes when asserting a valid floating point with trailing zeros at the end', () => {
		expect(assertARPrecision.bind(this, VALID_FLOATING_POINT_WITH_TRAILING_ZEROS)).to.not.throw();
	});

	it('Throws when asserting a fraction of a Winston', () => {
		expect(assertARPrecision.bind(this, A_HALF_A_WINSTON)).to.throw();
		expect(assertARPrecision.bind(this, EXCESSIVE_NONZERO_DIGITS)).to.throw();
	});

	it('Throws when asserting an NaN', () => {
		expect(assertARPrecision.bind(this, NOT_A_NUMBER)).to.throw();
	});

	it('Throws when asserting a negative value', () => {
		expect(assertARPrecision.bind(this, NEGATIVE_VALUE)).to.throw();
	});
});
