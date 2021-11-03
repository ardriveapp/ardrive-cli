import { expect } from 'chai';
import { W } from '../types/winston';
import { ARDataPrice } from './ar_data_price';
import { ARDataPriceRegression } from './data_price_regression';

describe('ARDataPriceRegression class', () => {
	const oneWinston = W(1);
	it('static constructor throws an error if no input data was supplied', () => {
		expect(() => new ARDataPriceRegression([])).to.throw(Error);
	});

	it('static constructor can create a regression from a single datapoint', () => {
		const inputDataPrice = new ARDataPrice(1, oneWinston);
		const predictedPrice = new ARDataPriceRegression([inputDataPrice]).predictedPriceForByteCount(1);
		expect(predictedPrice).to.deep.equal(inputDataPrice);
	});

	it('predictedPriceForByteCount throws an error for negative and non-integer byte counts', () => {
		const inputDataPrice = new ARDataPrice(1, oneWinston);
		const predictor = new ARDataPriceRegression([inputDataPrice]);
		expect(() => predictor.predictedPriceForByteCount(-1)).to.throw(Error);
		expect(() => predictor.predictedPriceForByteCount(0.5)).to.throw(Error);
	});

	it('predictedPriceForByteCount returns an accurate linear prediction', () => {
		const predictor = new ARDataPriceRegression([
			new ARDataPrice(1, oneWinston),
			new ARDataPrice(100, W(100)),
			new ARDataPrice(10000, W(10000))
		]);
		expect(predictor.predictedPriceForByteCount(0)).to.deep.equal(new ARDataPrice(0, W(0)));
		expect(predictor.predictedPriceForByteCount(1000000)).to.deep.equal(new ARDataPrice(1000000, W(1000000)));
	});

	it('predictedPriceForByteCount returns a rounded up estimate when the Winston price would otherwise be predicted as non-integer', () => {
		const predictor = new ARDataPriceRegression([new ARDataPrice(0, W(0)), new ARDataPrice(2, W(3))]);
		expect(predictor.predictedPriceForByteCount(1)).to.deep.equal(new ARDataPrice(1, W(2)));
	});

	it('baseWinstonPrice returns the correct base value', () => {
		const predictor = new ARDataPriceRegression([new ARDataPrice(0, W(100)), new ARDataPrice(5, W(600))]);
		expect(`${predictor.baseWinstonPrice()}`).to.equal('100');
	});

	it('marginalWinstonPrice returns the correct marginal value', () => {
		const predictor = new ARDataPriceRegression([new ARDataPrice(0, W(1)), new ARDataPrice(5, W(11))]);
		expect(predictor.marginalWinstonPrice()).to.equal(2);
	});
});
