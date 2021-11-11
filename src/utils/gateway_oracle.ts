import type { ArweaveOracle } from './arweave_oracle';
import fetch from 'node-fetch';
import { ByteCount, W, Winston } from '../types';
import { BigNumber } from 'bignumber.js';

export class GatewayOracle implements ArweaveOracle {
	async getWinstonPriceForByteCount(byteCount: ByteCount): Promise<Winston> {
		const response = await fetch(`https://arweave.net/price/${byteCount}`);
		const winstonAsString = await response.text();
		return W(new BigNumber(winstonAsString));
	}
}
