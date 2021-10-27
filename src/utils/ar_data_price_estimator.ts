import type { ArDriveCommunityTip, ByteCount } from '../types';

export const arPerWinston = 0.000_000_000_001;

export interface ARDataPriceEstimator {
	getBaseWinstonPriceForByteCount(byteCount: ByteCount): Promise<number>;
	getARPriceForByteCount: (byteCount: ByteCount, arDriveCommunityTip: ArDriveCommunityTip) => Promise<number>;
}

export abstract class AbstractARDataPriceEstimator implements ARDataPriceEstimator {
	abstract getBaseWinstonPriceForByteCount(byteCount: ByteCount): Promise<number>;

	/**
	 * Estimates the price in AR for a given byte count, including the ArDrive community tip
	 */
	async getARPriceForByteCount(
		byteCount: ByteCount,
		{ minWinstonFee, tipPercentage }: ArDriveCommunityTip
	): Promise<number> {
		const winstonPrice = await this.getBaseWinstonPriceForByteCount(byteCount);
		const communityWinstonFee = Math.max(winstonPrice * tipPercentage, minWinstonFee);

		const totalWinstonPrice = winstonPrice + communityWinstonFee;

		return totalWinstonPrice * arPerWinston;
	}
}

export interface ARDataCapacityEstimator {
	getByteCountForWinston: (winston: number) => Promise<ByteCount>;
	getByteCountForAR: (arPrice: number, arDriveCommunityTip: ArDriveCommunityTip) => Promise<ByteCount>;
}

// prettier-ignore
export abstract class AbstractARDataPriceAndCapacityEstimator extends AbstractARDataPriceEstimator implements ARDataCapacityEstimator
{
	abstract getByteCountForWinston(winston: number): Promise<ByteCount>;

	/**
	 * Estimates the number of bytes that can be stored for a given amount of AR
	 *
	 * @remarks Returns 0 bytes when the price does not cover minimum ArDrive community fee
	 */
	public async getByteCountForAR(
		arPrice: number,
		{ minWinstonFee, tipPercentage }: ArDriveCommunityTip
	): Promise<number> {
		const winstonPrice = arPrice / arPerWinston;

		const communityWinstonFee = Math.max(winstonPrice - winstonPrice / (1 + tipPercentage), minWinstonFee);

		const winstonPriceWithoutFee = Math.round(winstonPrice - communityWinstonFee);

		if (winstonPriceWithoutFee > 0) {
			return this.getByteCountForWinston(winstonPriceWithoutFee);
		}

		// Specified `arPrice` does not cover provided `minimumWinstonFee`
		return 0;
	}
}
