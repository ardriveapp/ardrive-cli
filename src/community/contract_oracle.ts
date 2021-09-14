import { CommunityContractData } from './verto_contract_oracle';

export interface ContractOracle {
	getCommunityContract(): Promise<CommunityContractData>;
	getTipSettingFromContractSettings(): Promise<number>;
	readContract(txId: string): Promise<unknown>;
}
