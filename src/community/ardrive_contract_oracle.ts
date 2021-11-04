import { CommunityContractData, CommunityTipPercentage } from './contract_types';
import { ContractOracle, ContractReader } from './contract_oracle';
import { TransactionID, TxID } from '../types';

// ArDrive Profit Sharing Community Smart Contract
export const communityTxId = '-8A6RexFkpfWwuyVO98wzSFZh0d6VJuI-buTJvlwOJQ';

const maxReadContractAttempts = 3;
const initialContractReader = 0;
const initialContractAttempts = 0;

/**
 * Oracle class responsible for retrieving the correct data fields from
 * the ArDrive Community Contract. This class can utilize several different
 * contract readers and will fallback to other readers if one fails
 *
 * @remarks Will begin fetching data from default contract reader on construction
 */
export class ArDriveContractOracle implements ContractOracle {
	constructor(
		/**
		 * Array of contract readers to use as fall back if one fails
		 * Uses contract reader at index 0 first then descends down the list
		 */
		private readonly contractReaders: ContractReader[],
		skipSetup = true
	) {
		if (!skipSetup) {
			// Get contract data upon construction
			this.getCommunityContract();
		}
	}

	private communityContract?: CommunityContractData;
	private contractPromise?: Promise<CommunityContractData>;

	/**
	 * Reads a smart contract with the current contract reader
	 *
	 * @remarks Will fallback to other contract readers when one fails
	 */
	async readContract(txId: TransactionID): Promise<unknown> {
		let contract: unknown;
		let currentContractReader = initialContractReader;
		let readContractAttempts = initialContractAttempts;

		while (!contract) {
			try {
				// Get contract with current contract reader's readContract implementation
				contract = await this.contractReaders[currentContractReader].readContract(txId);
			} catch (error) {
				console.error(`Contract could not be fetched: ${error}`);
				readContractAttempts++;

				if (readContractAttempts >= maxReadContractAttempts) {
					// Max attempts for contract reader has been reached
					if (currentContractReader === this.contractReaders.length - 1) {
						// Current contract reader is the last fallback, throw an error
						throw new Error(
							`Max contract read attempts has been reached on the last fallback contract reader..`
						);
					}

					// Else fallback to next reader
					const nextContractReaderIndex = currentContractReader + 1;
					readContractAttempts = initialContractAttempts;
					currentContractReader = nextContractReaderIndex;

					console.log('Falling back to next contract reader..');
				} else {
					console.log('Retrying with current contract reader..');
				}
			}
		}
		return contract;
	}

	/**
	 * @returns the ArDrive Community Smartweave Contract
	 * @throws when the Community Contract cannot be fetched or is returned as falsy
	 * @throws when the Community Contract is returned in an unexpected shape
	 */
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
		this.contractPromise = this.readContract(TxID(communityTxId)) as Promise<CommunityContractData>;

		this.communityContract = await this.contractPromise;

		delete this.contractPromise;

		return this.communityContract;
	}

	/**
	 * Grabs fee directly from the settings at the bottom of the community contract
	 *
	 * @throws When community fee cannot be read from the contract, is negative, or is the wrong type
	 */

	async getTipPercentageFromContract(): Promise<CommunityTipPercentage> {
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

		return arDriveCommTipFromSettings[1] / 100;
	}
}
