import { GatewayOracle } from './gateway_oracle';
import type { ArweaveOracle } from './arweave_oracle';
import { AbstractARDataPriceEstimator } from './ar_data_price_estimator';
import { ByteCount, Winston } from '../types';

export const arPerWinston = 0.000_000_000_001;

/**
 * A utility class for Arweave data pricing estimation.
 * Fetches Arweave data prices from an ArweaveOracle each time it's requested
 */
export class ARDataPriceOracleEstimator extends AbstractARDataPriceEstimator {
	constructor(private readonly oracle: ArweaveOracle = new GatewayOracle()) {
		super();
	}

	/**
	 * Generates a price estimate, in Winston, for an upload of size `byteCount`.
	 *
	 * @param byteCount the number of bytes for which a price estimate should be generated
	 *
	 * @returns Promise for the price of an upload of size `byteCount` in Winston
	 */
	public async getBaseWinstonPriceForByteCount(byteCount: ByteCount): Promise<Winston> {
		return this.oracle.getWinstonPriceForByteCount(byteCount);
	}
}
