import { expect } from 'chai';
import { ByteCount, W } from '../types';
import { ARDataPrice } from './ar_data_price';
import { ARDataPriceRegression } from './data_price_regression';

describe('ARDataPriceRegression class', () => {
	const oneWinston = W(1);
	it('static constructor throws an error if no input data was supplied', () => {
		expect(() => new ARDataPriceRegression([])).to.throw(Error);
	});

	it('static constructor can create a regression from a single datapoint', () => {
		const inputDataPrice: ARDataPrice = { numBytes: new ByteCount(1), winstonPrice: oneWinston };
		const predictedPrice = new ARDataPriceRegression([inputDataPrice]).predictedPriceForByteCount(new ByteCount(1));
		expect(predictedPrice).to.deep.equal(inputDataPrice);
	});

	it('predictedPriceForByteCount returns an accurate linear prediction', () => {
		const predictor = new ARDataPriceRegression([
			{ numBytes: new ByteCount(1), winstonPrice: oneWinston },
			{ numBytes: new ByteCount(100), winstonPrice: W(100) },
			{ numBytes: new ByteCount(10000), winstonPrice: W(10000) }
		]);
		expect(predictor.predictedPriceForByteCount(new ByteCount(0))).to.deep.equal({
			numBytes: new ByteCount(0),
			winstonPrice: W(0)
		});
		expect(predictor.predictedPriceForByteCount(new ByteCount(1000000))).to.deep.equal({
			numBytes: new ByteCount(1000000),
			winstonPrice: W(1000000)
		});
	});

	it('predictedPriceForByteCount returns a rounded up estimate when the Winston price would otherwise be predicted as non-integer', () => {
		const predictor = new ARDataPriceRegression([
			{ numBytes: new ByteCount(0), winstonPrice: W(0) },
			{ numBytes: new ByteCount(2), winstonPrice: W(3) }
		]);
		expect(predictor.predictedPriceForByteCount(new ByteCount(1))).to.deep.equal({
			numBytes: new ByteCount(1),
			winstonPrice: W(2)
		});
	});

	it('baseWinstonPrice returns the correct base value', () => {
		const predictor = new ARDataPriceRegression([
			{ numBytes: new ByteCount(0), winstonPrice: W(100) },
			{ numBytes: new ByteCount(5), winstonPrice: W(600) }
		]);
		expect(`${predictor.baseWinstonPrice()}`).to.equal('100');
	});

	it('marginalWinstonPrice returns the correct marginal value', () => {
		const predictor = new ARDataPriceRegression([
			{ numBytes: new ByteCount(0), winstonPrice: W(1) },
			{ numBytes: new ByteCount(5), winstonPrice: W(11) }
		]);
		expect(predictor.marginalWinstonPrice()).to.equal(2);
	});
});
