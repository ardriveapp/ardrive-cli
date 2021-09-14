import Arweave from 'arweave';
import { readContract } from 'smartweave';
import { ContractReader } from './contract_oracle';

/**
 *  Oracle class responsible for retrieving and reading
 *  Smartweave Contracts from Arweave with the `smartweave` package
 */
export class SmartweaveContractReader implements ContractReader {
	constructor(private readonly arweave: Arweave) {}

	/** Fetches smartweave contracts from Arweave with smartweave-js */
	async readContract(txId: string): Promise<unknown> {
		return readContract(this.arweave, txId);
	}
}
