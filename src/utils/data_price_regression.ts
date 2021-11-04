import regression, { DataPoint } from 'regression';
import { W, Winston, ByteCount } from '../types';
import { ARDataPrice } from './ar_data_price';

/**
 * A prediction tool for estimating the AR price (in Winston) for a data upload of a specified size based
 * on a supplied set of observations of market prices. A linear prediction model is used for estimation.
 */
export class ARDataPriceRegression {
	private readonly regression: regression.Result;

	/**
	 * Create a new price curve (linear) regression based on the supplied set of input price observations
	 * @param pricingData an array of recent data price observations
	 * @returns an ARDataPriceRegression that is ready for generating price predictions
	 * @throws {@link Error} for an empty pricing data array
	 */
	constructor(pricingData: ARDataPrice[]) {
		if (!pricingData.length) {
			throw new Error('Regression can not be run with an empty ARDataPrice list!');
		}

		const dataPoints: DataPoint[] = pricingData.map(
			// TODO: BigNumber regressions
			(pricingDatapoint) => [+pricingDatapoint.numBytes, +pricingDatapoint.winstonPrice.toString()] as DataPoint
		);

		this.regression = regression.linear(dataPoints);
	}

	/**
	 * Predicts the AR (Winston) price for an upload with the specified size
	 * @param numBytes the size, in bytes, of the upload whose price we want to predict
	 * @returns the ARDataPrice predicted by the regression model for an upload of size `numBytes`
	 * @throws {@link Error} if `numBytes` is negative or not an integer
	 */
	predictedPriceForByteCount(numBytes: ByteCount): ARDataPrice {
		const regressionResult = this.regression.predict(+numBytes);
		// TODO: BigNumber regressions
		return { numBytes: new ByteCount(regressionResult[0]), winstonPrice: W(Math.ceil(regressionResult[1])) };
	}

	/**
	 * Returns the current base AR price in Winston for submitting an Arweave transaction,
	 * which has been calculated by the regression model
	 */
	baseWinstonPrice(): Winston {
		return W(this.regression.equation[1]);
	}

	/**
	 * Returns the current marginal AR price in Winston (winston price per byte),
	 * which has been calculated by the regression model
	 */
	marginalWinstonPrice(): number {
		return this.regression.equation[0];
	}
}
