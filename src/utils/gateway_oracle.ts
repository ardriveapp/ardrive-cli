import type { ArweaveOracle } from './arweave_oracle';
import fetch from 'node-fetch';
import { ByteCount } from '../types';

export class GatewayOracle implements ArweaveOracle {
	async getWinstonPriceForByteCount(byteCount: ByteCount): Promise<number> {
		const response = await fetch(`https://arweave.net/price/${byteCount}`);
		const winstonAsString = await response.text();
		return +winstonAsString;
	}
}
