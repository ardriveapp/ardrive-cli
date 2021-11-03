import BigNumber from 'bignumber.js';

export class FeeMultiple {
	constructor(private readonly feeMultiple: number) {
		if (this.feeMultiple < 1.0 || Number.isNaN(feeMultiple) || !Number.isFinite(feeMultiple)) {
			throw new Error('Fee multiple must be >= 1.0!');
		}
	}

	[Symbol.toPrimitive](hint?: string): string | number {
		if (hint === 'string') {
			return this.toString();
		}

		return this.feeMultiple;
	}

	toString(): string {
		return `${this.feeMultiple}`;
	}

	valueOf(): number {
		return this.feeMultiple;
	}

	equals(other: FeeMultiple): boolean {
		// Hard to say what precision to use here. Use EPSILON by default since most multiples will be pretty small
		return Math.abs(this.feeMultiple - other.feeMultiple) < Number.EPSILON;
	}

	toJSON(): string {
		return this.toString();
	}

	wouldBoostReward(): boolean {
		return this.feeMultiple > 1.0;
	}

	boostReward(reward: string): string {
		// Round up with because fractional Winston will cause an Arweave API failure
		return new BigNumber(reward).times(new BigNumber(this.feeMultiple)).toFixed(0, BigNumber.ROUND_UP);
	}
}
