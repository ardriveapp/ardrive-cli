import { expect } from 'chai';
import { Winston } from '../types/winston';
import { ARDataPrice } from './ar_data_price';
import { ARDataPriceRegression } from './data_price_regression';

describe('ARDataPriceRegression class', () => {
	const oneWinston = new Winston(1);
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
			new ARDataPrice(100, new Winston(100)),
			new ARDataPrice(10000, new Winston(10000))
		]);
		expect(predictor.predictedPriceForByteCount(0)).to.deep.equal(new ARDataPrice(0, new Winston(0)));
		expect(predictor.predictedPriceForByteCount(1000000)).to.deep.equal(
			new ARDataPrice(1000000, new Winston(1000000))
		);
	});

	it('predictedPriceForByteCount returns a rounded up estimate when the Winston price would otherwise be predicted as non-integer', () => {
		const predictor = new ARDataPriceRegression([
			new ARDataPrice(0, new Winston(0)),
			new ARDataPrice(2, new Winston(3))
		]);
		expect(predictor.predictedPriceForByteCount(1)).to.deep.equal(new ARDataPrice(1, new Winston(2)));
	});

	it('baseWinstonPrice returns the correct base value', () => {
		const predictor = new ARDataPriceRegression([
			new ARDataPrice(0, new Winston(100)),
			new ARDataPrice(5, new Winston(600))
		]);
		expect(`${predictor.baseWinstonPrice()}`).to.equal('100');
	});

	it('marginalWinstonPrice returns the correct marginal value', () => {
		const predictor = new ARDataPriceRegression([
			new ARDataPrice(0, new Winston(1)),
			new ARDataPrice(5, new Winston(11))
		]);
		expect(predictor.marginalWinstonPrice()).to.equal(2);
	});
});
