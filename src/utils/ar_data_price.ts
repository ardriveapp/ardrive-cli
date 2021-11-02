import { ByteCount } from '../types';
import { Winston } from '../types/winston';

/**
 * Immutable data container class representing a market price in Winston for a particular volume
 * of data that enforces valid number ranges for byte counts and Winston price values.
 */
export class ARDataPrice {
	/**
	 * @returns an ARDataPrice instance with the given byte count and Winston amount
	 * @throws {@link Error} if negative or non-integer values are provided for either value
	 */
	constructor(readonly numBytes: ByteCount, readonly winstonPrice: Winston) {
		if (numBytes < 0 || !Number.isInteger(numBytes)) {
			throw new Error(`numBytes (${numBytes}) should be a non-negative integer value.`);
		}

		this.numBytes = numBytes;
	}
}
