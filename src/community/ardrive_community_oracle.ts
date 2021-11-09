import { weightedRandom } from 'ardrive-core-js';
import { ContractOracle, ContractReader } from './contract_oracle';
import { CommunityOracle } from './community_oracle';
import { ArDriveContractOracle } from './ardrive_contract_oracle';
import Arweave from 'arweave';
import { SmartweaveContractReader } from './smartweave_contract_oracle';
import { VertoContractReader } from './verto_contract_oracle';
import { ADDR, ArweaveAddress, W, Winston } from '../types';

/**
 * Minimum ArDrive community tip from the Community Improvement Proposal Doc:
 * https://arweave.net/Yop13NrLwqlm36P_FDCdMaTBwSlj0sdNGAC4FqfRUgo
 */
export const minArDriveCommunityWinstonTip = W(10_000_000);

/**
 * Oracle class responsible for determining the community tip
 * and selecting the PST token holder for tip distribution
 *
 * TODO: Unit testing for important functions
 */
export class ArDriveCommunityOracle implements CommunityOracle {
	constructor(readonly arweave: Arweave, contractReaders?: ContractReader[]) {
		this.contractOracle = new ArDriveContractOracle(
			contractReaders ? contractReaders : this.defaultContractReaders
		);
	}

	private readonly contractOracle: ContractOracle;

	private defaultContractReaders: ContractReader[] = [
		new VertoContractReader(),
		new SmartweaveContractReader(this.arweave)
	];

	/**
	 * Given a Winston data cost, returns a calculated ArDrive community tip amount in Winston
	 *
	 * TODO: Use big int library on Winston types
	 */
	async getCommunityWinstonTip(winstonCost: Winston): Promise<Winston> {
		const communityTipPercentage = await this.contractOracle.getTipPercentageFromContract();
		const arDriveCommunityTip = winstonCost.times(communityTipPercentage);
		return Winston.max(arDriveCommunityTip, minArDriveCommunityWinstonTip);
	}

	/**
	 * Gets a random ArDrive token holder based off their weight (amount of tokens they hold)
	 *
	 * TODO: This is mostly copy-paste from core -- refactor into a more testable state
	 */
	async selectTokenHolder(): Promise<ArweaveAddress> {
		// Read the ArDrive Smart Contract to get the latest state
		const contract = await this.contractOracle.getCommunityContract();

		const balances = contract.balances;
		const vault = contract.vault;

		// Get the total number of token holders
		let total = 0;
		for (const addr of Object.keys(balances)) {
			total += balances[addr];
		}

		// Check for how many tokens the user has staked/vaulted
		for (const addr of Object.keys(vault)) {
			if (!vault[addr].length) continue;

			const vaultBalance = vault[addr]
				.map((a: { balance: number; start: number; end: number }) => a.balance)
				.reduce((a: number, b: number) => a + b, 0);

			total += vaultBalance;

			if (addr in balances) {
				balances[addr] += vaultBalance;
			} else {
				balances[addr] = vaultBalance;
			}
		}

		// Create a weighted list of token holders
		const weighted: { [addr: string]: number } = {};
		for (const addr of Object.keys(balances)) {
			weighted[addr] = balances[addr] / total;
		}
		// Get a random holder based off of the weighted list of holders
		const randomHolder = weightedRandom(weighted);

		if (randomHolder === undefined) {
			throw new Error('Token holder target could not be determined for community tip distribution..');
		}

		return ADDR(randomHolder);
	}
}
