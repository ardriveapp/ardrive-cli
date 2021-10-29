import type { ArDriveCommunityTip, ByteCount } from '../types';
import { AR, Winston } from '../types/winston';

export const arPerWinston = 0.000_000_000_001;

export interface ARDataPriceEstimator {
	getBaseWinstonPriceForByteCount(byteCount: ByteCount): Promise<Winston>;
	getARPriceForByteCount: (byteCount: ByteCount, arDriveCommunityTip: ArDriveCommunityTip) => Promise<AR>;
}

export abstract class AbstractARDataPriceEstimator implements ARDataPriceEstimator {
	abstract getBaseWinstonPriceForByteCount(byteCount: ByteCount): Promise<Winston>;

	/**
	 * Estimates the price in AR for a given byte count, including the ArDrive community tip
	 */
	async getARPriceForByteCount(
		byteCount: ByteCount,
		{ minWinstonFee, tipPercentage }: ArDriveCommunityTip
	): Promise<AR> {
		const winstonPrice = await this.getBaseWinstonPriceForByteCount(byteCount);
		const communityWinstonFee = Winston.max(winstonPrice.times(tipPercentage), minWinstonFee);

		const totalWinstonPrice = winstonPrice.plus(communityWinstonFee);

		return new AR(totalWinstonPrice);
	}
}

export interface ARDataCapacityEstimator {
	getByteCountForWinston: (winston: Winston) => Promise<ByteCount>;
	getByteCountForAR: (arPrice: AR, arDriveCommunityTip: ArDriveCommunityTip) => Promise<ByteCount>;
}

// prettier-ignore
export abstract class AbstractARDataPriceAndCapacityEstimator extends AbstractARDataPriceEstimator implements ARDataCapacityEstimator
{
	abstract getByteCountForWinston(winston: Winston): Promise<ByteCount>;

	/**
	 * Estimates the number of bytes that can be stored for a given amount of AR
	 *
	 * @remarks Returns 0 bytes when the price does not cover minimum ArDrive community fee
	 */
	public async getByteCountForAR(
		arPrice: AR,
		{ minWinstonFee, tipPercentage }: ArDriveCommunityTip
	): Promise<ByteCount> {
		const winstonPrice = arPrice.toWinston();
		const communityWinstonFee = Winston.max(winstonPrice.minus(winstonPrice.dividedBy(1 + tipPercentage)), minWinstonFee);
		if (winstonPrice.isGreaterThan(communityWinstonFee)) {
			return this.getByteCountForWinston(winstonPrice.minus(communityWinstonFee));
		}

		// Specified `arPrice` does not cover provided `minimumWinstonFee`
		return 0;
	}
}
