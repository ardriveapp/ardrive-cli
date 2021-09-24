import type { ArweaveOracle } from './arweave_oracle';
import fetch from 'node-fetch';

export class GatewayOracle implements ArweaveOracle {
	async getWinstonPriceForByteCount(byteCount: number): Promise<number> {
		const response = await fetch(`https://arweave.net/price/${byteCount}`);
		const winstonAsString = await response.text();
		return +winstonAsString;
	}
}
