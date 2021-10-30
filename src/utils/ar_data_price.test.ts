import { expect } from 'chai';
import { W } from '../types/winston';
import { ARDataPrice } from './ar_data_price';

describe('ARDataPrice class', () => {
	const stubWinston = W(0);
	it('constructor throws an exception when a negative data volume is provided', () => {
		expect(() => new ARDataPrice(-1, stubWinston)).to.throw(Error);
	});

	it('constructor throws an exception when a non-integer data volume is provided', () => {
		expect(() => new ARDataPrice(0.5, stubWinston)).to.throw(Error);
	});

	// TODO: MOVE TO A WINSTON/AR TEST
	// it('constructor throws an exception when a negative Winston value is provided', () => {
	// 	expect(() => new ARDataPrice(-1, -1)).to.throw(Error);
	// 	expect(() => new ARDataPrice(0, -1)).to.throw(Error);
	// 	expect(() => new ARDataPrice(0.5, -1)).to.throw(Error);
	// 	expect(() => new ARDataPrice(1, -1)).to.throw(Error);
	// });

	// it('constructor throws an exception when a non-integer Winston value is provided', () => {
	// 	expect(() => new ARDataPrice(-1, 0.5)).to.throw(Error);
	// 	expect(() => new ARDataPrice(0, 0.5)).to.throw(Error);
	// 	expect(() => new ARDataPrice(0.5, 0.5)).to.throw(Error);
	// 	expect(() => new ARDataPrice(1, 0.5)).to.throw(Error);
	// });

	it('constructs a valid object when zeros are provided', () => {
		const actual = new ARDataPrice(0, stubWinston);
		expect(actual.numBytes).to.equal(0);
		expect(`${actual.winstonPrice}`).to.equal('0');
	});

	it('constructs a valid object when non-zero values are provided', () => {
		const actual = new ARDataPrice(1, W(1));
		expect(actual.numBytes).to.equal(1);
		expect(`${actual.winstonPrice}`).to.equal('1');
	});

	it('constructs a valid object when max Int values are provided', () => {
		const actual = new ARDataPrice(Number.MAX_SAFE_INTEGER, W(Number.MAX_SAFE_INTEGER));
		expect(actual.numBytes).to.equal(Number.MAX_SAFE_INTEGER);
		expect(`${actual.winstonPrice}`).to.equal(`${Number.MAX_SAFE_INTEGER}`);
	});
});
