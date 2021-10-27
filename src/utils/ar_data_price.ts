import { ByteCount } from '../types';

/**
 * Immutable data container class representing a market price in Winston for a particular volume
 * of data that enforces valid number ranges for byte counts and Winston price values.
 */
export class ARDataPrice {
	/**
	 * @returns an ARDataPrice instance with the given byte count and Winston amount
	 * @throws {@link Error} if negative or non-integer values are provided for either value
	 */
	constructor(readonly numBytes: ByteCount, readonly winstonPrice: number) {
		if (numBytes < 0 || !Number.isInteger(numBytes) || winstonPrice < 0 || !Number.isInteger(winstonPrice)) {
			throw new Error(
				`numBytes (${numBytes}) and winstonPrice (${winstonPrice}) should be non-negative integer values.`
			);
		}

		this.numBytes = numBytes;
		this.winstonPrice = winstonPrice;
	}
}
