import type { ArweaveOracle } from './arweave_oracle';
import fetch from 'node-fetch';
import { ByteCount } from '../types';
import { Winston } from '../types/winston';
import { BigNumber } from 'bignumber.js';

export class GatewayOracle implements ArweaveOracle {
	async getWinstonPriceForByteCount(byteCount: ByteCount): Promise<Winston> {
		const response = await fetch(`https://arweave.net/price/${byteCount}`);
		const winstonAsString = await response.text();
		return new Winston(new BigNumber(winstonAsString));
	}
}
