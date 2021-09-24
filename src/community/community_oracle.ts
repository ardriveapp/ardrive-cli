import { Winston, ArweaveAddress } from '../types';

export interface CommunityOracle {
	getCommunityWinstonTip(winstonCost: Winston): Promise<Winston>;
	selectTokenHolder(): Promise<ArweaveAddress>;
}
