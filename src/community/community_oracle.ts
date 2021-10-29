import { ArweaveAddress } from '../types/arweave_address';
import { Winston } from '../types/winston';

export interface CommunityOracle {
	getCommunityWinstonTip(winstonCost: Winston): Promise<Winston>;
	selectTokenHolder(): Promise<ArweaveAddress>;
}
