import fetch from 'node-fetch';
import { TransactionID } from '../types';
import { ContractReader } from './contract_oracle';

/**
 *  Oracle class responsible for retrieving and
 *  reading Smartweave Contracts from the Verto cache
 */
export class VertoContractReader implements ContractReader {
	/** Fetches smartweave contracts from the Verto cache */
	public async readContract(txId: TransactionID): Promise<unknown> {
		const response = await fetch(`https://v2.cache.verto.exchange/${txId}`);
		const contract = await response.json();
		return contract.state;
	}
}
