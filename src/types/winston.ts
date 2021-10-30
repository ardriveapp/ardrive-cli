import { BigNumber } from 'bignumber.js';

export class Winston {
	private amount: BigNumber;
	constructor(amount: BigNumber.Value) {
		this.amount = new BigNumber(amount);
		if (this.amount.isLessThan(0)) {
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
		return `${this.amount}`;
	}

	valueOf(): string {
		return `${this.amount}`;
	}

	static max(...winstons: Winston[]): Winston {
		BigNumber.max();
		return winstons.reduce((max, next) => (next.amount.isGreaterThan(max.amount) ? next : max));
	}
}

export class AR {
	constructor(readonly winston: Winston) {}

	static from(arValue: BigNumber.Value): AR {
		const bigWinston = new BigNumber(arValue).shiftedBy(12);
		const numDecimalPlace = bigWinston.decimalPlaces();
		if (numDecimalPlace > 12) {
			throw new Error(`The AR amount must have a maximum of 12 digits of precision, but got ${numDecimalPlace}`);
		}
		return new AR(W(bigWinston));
	}

	toString(): string {
		BigNumber.config({ DECIMAL_PLACES: 12 });
		const w = new BigNumber(this.winston.toString());
		return w.shiftedBy(-12).toFixed();
	}

	valueOf(): string {
		return this.toString();
	}

	toWinston(): Winston {
		return this.winston;
	}
}

export function W(amount: BigNumber.Value): Winston {
	return new Winston(amount);
}
