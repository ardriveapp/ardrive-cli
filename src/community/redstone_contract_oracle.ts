import Arweave from 'arweave';
import { SmartWeaveNodeFactory } from 'redstone-smartweave';
import { ContractReader } from './contract_oracle';

/**
 *  Oracle class responsible for retrieving and reading
 *  Smartweave Contracts from Arweave with the `smartweave` package
 */
export class RedstoneContractReader implements ContractReader {
	constructor(private readonly arweave: Arweave) {}

	/** Fetches smartweave contracts from Arweave with redstone-smartweave */
	public async readContract(txId: string): Promise<unknown> {
		const smartweave = SmartWeaveNodeFactory.memCached(this.arweave);
		const providersRegistryContract = smartweave.contract(txId);
		const contract = await providersRegistryContract.readState();
		return contract.state;
	}
}
