import { ArweaveAddress, Winston } from '../wallet_new';

export interface CommunityOracle {
	getCommunityWinstonTip(winstonCost: Winston): Promise<Winston>;
	selectTokenHolder(): Promise<ArweaveAddress>;
}
