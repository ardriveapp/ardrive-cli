import { ByteCount } from '../types';
import { Winston } from '../types/winston';

export interface ArweaveOracle {
	getWinstonPriceForByteCount(byteCount: ByteCount): Promise<Winston>;
}
