import fetch from 'node-fetch';
import { ContractOracle } from './contract_oracle';

// ArDrive Profit Sharing Community Smart Contract
export const communityTxId = '-8A6RexFkpfWwuyVO98wzSFZh0d6VJuI-buTJvlwOJQ';

export interface CommunityContractData {
	votes: [Record<string, unknown>];
	settings: [string, unknown][];
	balances: { [tokenHolderAddress: string]: number };
	vault: { [tokenHolderAddress: string]: { balance: number; start: number; end: number }[] };
}

/**
 *  Oracle class responsible for retrieving and reading the
 *  ArDrive Community Smartweave Contract from the Verto cache
 *
 * @remarks Will begin reading Verto cache on construction
 */
export class VertoContractOracle implements ContractOracle {
	constructor() {
		// Get contract data upon construction
		this.getCommunityContract();
	}

	private communityContract?: CommunityContractData;
	private contractPromise?: Promise<CommunityContractData>;

	/** Fetches smartweave contracts from the Verto cache */
	public async readContract(txId: string): Promise<unknown> {
		const response = await fetch(`https://v2.cache.verto.exchange/${txId}`);
		const contract = await response.json();
		return contract.state;
	}

	/**
	 * @returns the ArDrive Community Smartweave Contract
	 * @throws when the Community Contract cannot be fetched or is returned as falsy
	 * @throws when the Community Contract is returned in an unexpected shape
	 * */
	public async getCommunityContract(): Promise<CommunityContractData> {
		// Contract data already cached, return contract data
		if (this.communityContract) {
			return this.communityContract;
		}

		// Contract promise still resolving, return promise with contract data
		if (this.contractPromise) {
			return this.contractPromise;
		}

		// Begin new contract read; cast result to known ArDrive Community Contract type
		this.contractPromise = this.readContract(communityTxId) as Promise<CommunityContractData>;

		this.communityContract = await this.contractPromise;

		if (!this.communityContract) {
			throw new Error('Community contract could not be fetched..');
		}

		if (!this.communityContract.settings || !this.communityContract.balances) {
			throw new Error(`Community contract has been returned in an unexpected shape: ${this.communityContract}`);
		}

		delete this.contractPromise;

		return this.communityContract;
	}

	/* Grabs fee directly from the settings at the bottom of the community contract */
	async getTipSettingFromContractSettings(): Promise<number> {
		const contract = await this.getCommunityContract();

		const arDriveCommTipFromSettings: [string, unknown] | undefined = contract.settings.find(
			(setting) => setting[0] === 'fee'
		);

		if (!arDriveCommTipFromSettings) {
			throw new Error('Fee does not exist on smart contract settings');
		}

		if (typeof arDriveCommTipFromSettings[1] !== 'number') {
			throw new Error('Fee on smart contract settings is not a number');
		}

		if (arDriveCommTipFromSettings[1] < 0) {
			throw new Error('Fee on smart contract community settings is set to a negative number');
		}

		return arDriveCommTipFromSettings[1];
	}
}
