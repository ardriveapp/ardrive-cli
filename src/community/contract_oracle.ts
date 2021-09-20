import { CommunityContractData } from './contract_types';

/** An oracle interface responsible for reading contracts and retrieving the ArDrive Community Contract */
export interface ContractOracle extends ContractReader {
	getCommunityContract(): Promise<CommunityContractData>;
	getTipSettingFromContractSettings(): Promise<number>;
}

export interface ContractReader {
	readContract(txId: string): Promise<unknown>;
}
