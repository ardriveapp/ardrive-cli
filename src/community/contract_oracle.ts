import { CommunityContractData } from './ardrive_contract_oracle';

/** An oracle interface responsible for reading contracts and retrieving the ArDrive Community Contract */
export interface ContractOracle extends ContractReader {
	getCommunityContract(): Promise<CommunityContractData>;
	getTipSettingFromContractSettings(): Promise<number>;
}

export interface ContractReader {
	readContract(txId: string): Promise<unknown>;
}
