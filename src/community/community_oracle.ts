import { ArweaveAddress } from '../wallet_new';

export interface CommunityOracle {
	getCommunityARTip(arCost: number): Promise<number>;
	selectTokenHolder(): Promise<ArweaveAddress>;
}
