import { TransactionID } from '../types';
import { CommunityContractData, CommunityTipPercentage } from './contract_types';

/** An oracle interface responsible for reading contracts and retrieving the ArDrive Community Contract */
export interface ContractOracle extends ContractReader {
	getCommunityContract(): Promise<CommunityContractData>;
	getTipPercentageFromContract(): Promise<CommunityTipPercentage>;
}

export interface ContractReader {
	readContract(txId: TransactionID): Promise<unknown>;
}
