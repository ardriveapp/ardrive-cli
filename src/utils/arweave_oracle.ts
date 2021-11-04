import { ByteCount, Winston } from '../types';

export interface ArweaveOracle {
	getWinstonPriceForByteCount(byteCount: ByteCount): Promise<Winston>;
}
