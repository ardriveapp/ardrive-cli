import { ByteCount, Winston } from '../types/';

/**
 * Immutable data container type representing a market price in Winston for a particular volume
 * of data that enforces valid number ranges for byte counts and Winston price values.
 */
export interface ARDataPrice {
	readonly numBytes: ByteCount;
	readonly winstonPrice: Winston;
}
