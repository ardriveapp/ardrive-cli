import { ArweaveAddress } from '../arweave_address';
import { Winston } from '../types';

export interface CommunityOracle {
	getCommunityWinstonTip(winstonCost: Winston): Promise<Winston>;
	selectTokenHolder(): Promise<ArweaveAddress>;
}
