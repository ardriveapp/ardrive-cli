import { GatewayOracle } from './gateway_oracle';
import type { ArweaveOracle } from './arweave_oracle';
import { ARDataPriceRegression } from './data_price_regression';
import { AbstractARDataPriceAndCapacityEstimator } from './ar_data_price_estimator';
import type { ArDriveCommunityTip } from '../types';
import { AR, ByteCount, Winston } from '../types/';

/**
 * A utility class for Arweave data pricing estimation.
 * Fetches Arweave data prices to build a linear regression model to use for estimations.
 */
export class ARDataPriceRegressionEstimator extends AbstractARDataPriceAndCapacityEstimator {
	public static readonly sampleByteVolumes = [
		Math.pow(2, 10) * 100, // 100 KiB
		Math.pow(2, 20) * 100, // 100 MiB
		Math.pow(2, 30) * 10 // 10 GiB
	].map((volume) => new ByteCount(volume));
	private predictor?: ARDataPriceRegression;
	private setupPromise?: Promise<ARDataPriceRegression>;

	/**
	 * Creates a new estimator. Fetches pricing data proactively unless `skipSetup` is true.
	 *
	 * @param skipSetup allows for instantiation without prefetching pricing data from the oracle
	 * @param oracle a datasource for Arweave data pricing
	 * @param byteVolumes an array of non-negative byte integers to fetch for pricing data
	 *
	 * @throws when byteVolumes array has less than 2 values
	 * @throws when volumes on byteVolumes array are negative or non-integer decimal values
	 *
	 * @returns an ARDataPriceEstimator
	 */
	constructor(
		skipSetup = false,
		private readonly oracle: ArweaveOracle = new GatewayOracle(),
		private readonly byteVolumes: ByteCount[] = ARDataPriceRegressionEstimator.sampleByteVolumes
	) {
		super();
		if (byteVolumes.length < 2) {
			throw new Error('Byte volume array must contain at least 2 values to calculate regression');
		}

		if (!skipSetup) {
			this.refreshPriceData();
		}
	}

	/**
	 * Updates the regression model with fresh data from the pricing oracle
	 *
	 * @returns Promise for an {@link ARDataPriceRegression}
	 */
	public async refreshPriceData(): Promise<ARDataPriceRegression> {
		// Don't kick off another refresh while refresh is in progress
		if (this.setupPromise) {
			return this.setupPromise;
		}

		// Fetch the price for all values in byteVolume array and feed them into a linear regression
		this.setupPromise = Promise.all(
			// TODO: What to do if one fails?
			this.byteVolumes.map(async (sampleByteCount) => {
				const winstonPrice = await this.oracle.getWinstonPriceForByteCount(sampleByteCount);
				return { numBytes: sampleByteCount, winstonPrice };
			})
		).then((pricingData) => new ARDataPriceRegression(pricingData));

		this.predictor = await this.setupPromise;
		return this.predictor;
	}

	/**
	 * Generates a price estimate, in Winston, for an upload of size `byteCount`.
	 *
	 * @param byteCount the number of bytes for which a price estimate should be generated
	 *
	 * @returns Promise for the price of an upload of size `byteCount` in Winston
	 *
	 * @remarks Will fetch pricing data for regression modeling if a regression has not yet been run.
	 */
	public async getBaseWinstonPriceForByteCount(byteCount: ByteCount): Promise<Winston> {
		// Lazily generate the price predictor
		if (!this.predictor) {
			await this.refreshPriceData();
			if (!this.predictor) {
				throw Error('Failed to generate pricing model!');
			}
		}

		const predictedPrice = this.predictor.predictedPriceForByteCount(byteCount);
		return predictedPrice.winstonPrice;
	}

	/**
	 * Estimates the number of bytes that can be stored for a given amount of Winston
	 *
	 * @throws On invalid winston values and on any issues generating pricing models
	 *
	 * @remarks Will fetch pricing data for regression modeling if a regression has not yet been run.
	 * @remarks The ArDrive community fee is not considered in this estimation
	 */
	public async getByteCountForWinston(winston: Winston): Promise<ByteCount> {
		// Lazily generate the price predictor
		if (!this.predictor) {
			await this.refreshPriceData();
			if (!this.predictor) {
				throw Error('Failed to generate pricing model!');
			}
		}

		// Return 0 if winston price given does not cover the base winston price for a transaction
		// TODO: Is number sufficient here vs. BigNumber?
		const baseWinstonPrice = this.predictor.baseWinstonPrice();
		const marginalWinstonPrice = this.predictor.marginalWinstonPrice();
		if (winston.isGreaterThan(baseWinstonPrice)) {
			return new ByteCount(+winston.minus(baseWinstonPrice).dividedBy(marginalWinstonPrice).toString());
		}

		return new ByteCount(0);
	}

	/**
	 * Estimates the number of bytes that can be stored for a given amount of AR
	 *
	 * @remarks Will fetch pricing data for regression modeling if a regression has not yet been run.
	 * @remarks Returns 0 bytes when the price does not cover minimum ArDrive community fee
	 */
	public async getByteCountForAR(
		arPrice: AR,
		{ minWinstonFee, tipPercentage }: ArDriveCommunityTip
	): Promise<ByteCount> {
		// Lazily generate the price predictor
		if (!this.predictor) {
			await this.refreshPriceData();
			if (!this.predictor) {
				throw Error('Failed to generate pricing model!');
			}
		}

		return super.getByteCountForAR(arPrice, { minWinstonFee, tipPercentage });
	}
}
