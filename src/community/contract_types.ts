import { ArweaveAddress } from '../types';

export type CommunityTipPercentage = number;

/** Shape of the ArDrive Community Smart Contract */
export interface CommunityContractData {
	name: 'ArDrive';
	ticker: 'ARDRIVE';
	votes: communityContractVotes[];
	settings: CommunityContractSettings;
	balances: { [tokenHolderAddress: string]: number };
	vault: { [tokenHolderAddress: string]: { balance: number; start: number; end: number }[] };
}

interface communityContractVotes {
	status: 'passed' | 'quorumFailed';
	type: 'burnVault' | 'mintLocked' | 'mint' | 'set';
	note: string;
	yays: number;
	nays: number;
	voted: ArweaveAddress[];
	start: number;
	totalWeight: number;
	recipient?: ArweaveAddress;
	qty?: number;
	lockLength?: number;
}

type CommunityContractSettings = [
	['quorum', number],
	['support', number],
	['voteLength', number],
	['lockMinLength', number],
	['lockMaxLength', number],
	['communityAppUrl', string],
	['communityDiscussionLinks', string[]],
	['communityDescription', string],
	['communityLogo', ArweaveAddress],
	['fee', number]
];
