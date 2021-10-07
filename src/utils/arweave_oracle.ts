import { ByteCount } from '../types';

export interface ArweaveOracle {
	getWinstonPriceForByteCount(byteCount: ByteCount): Promise<number>;
}
