import { BigNumber } from 'bignumber.js';
import { W, Winston } from './winston';

export class AR {
	constructor(readonly winston: Winston) {}

	static from(arValue: BigNumber.Value): AR {
		const bigWinston = new BigNumber(arValue).shiftedBy(12);
		const numDecimalPlaces = bigWinston.decimalPlaces();
		if (numDecimalPlaces > 0) {
			throw new Error(
				`The AR amount must have a maximum of 12 digits of precision, but got ${numDecimalPlaces + 12}`
			);
		}
		return new AR(W(bigWinston));
	}

	toString(): string {
		BigNumber.config({ DECIMAL_PLACES: 12 });
		const w = new BigNumber(this.winston.toString(), 10);
		return w.shiftedBy(-12).toFixed();
	}

	valueOf(): string {
		return this.toString();
	}

	toWinston(): Winston {
		return this.winston;
	}

	toJSON(): string {
		return this.toString();
	}
}
