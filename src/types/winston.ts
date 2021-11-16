import { BigNumber } from 'bignumber.js';

export class Winston {
	private amount: BigNumber;
	constructor(amount: BigNumber.Value) {
		this.amount = new BigNumber(amount);
		if (this.amount.isLessThan(0) || !this.amount.isInteger()) {
			throw new Error('Winston value should be a non-negative integer!');
		}
	}

	plus(winston: Winston): Winston {
		return W(this.amount.plus(winston.amount));
	}

	minus(winston: Winston): Winston {
		return W(this.amount.minus(winston.amount));
	}

	times(multiplier: BigNumber.Value): Winston {
		return W(this.amount.times(multiplier).decimalPlaces(0, BigNumber.ROUND_DOWN));
	}

	dividedBy(divisor: BigNumber.Value): Winston {
		// TODO: Best rounding strategy? Up or down?
		return W(this.amount.dividedBy(divisor).decimalPlaces(0, BigNumber.ROUND_CEIL));
	}

	isGreaterThan(winston: Winston): boolean {
		return this.amount.isGreaterThan(winston.amount);
	}

	static difference(a: Winston, b: Winston): string {
		return a.amount.minus(b.amount).toString();
	}

	toString(): string {
		return this.amount.toFixed();
	}

	valueOf(): string {
		return this.amount.toFixed();
	}

	toJSON(): string {
		return this.toString();
	}

	static max(...winstons: Winston[]): Winston {
		BigNumber.max();
		return winstons.reduce((max, next) => (next.amount.isGreaterThan(max.amount) ? next : max));
	}
}

export function W(amount: BigNumber.Value): Winston {
	return new Winston(amount);
}
