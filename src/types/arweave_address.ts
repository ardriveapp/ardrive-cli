import { Equatable } from './equatable';

export class ArweaveAddress implements Equatable<ArweaveAddress> {
	constructor(private readonly address: string) {
		if (!address.match(new RegExp('^[a-zA-Z0-9_-]{43}$'))) {
			throw new Error(
				'Arweave addresses must be 43 characters in length with characters in the following set: [a-zA-Z0-9_-]'
			);
		}
	}

	[Symbol.toPrimitive](hint?: string): string {
		if (hint === 'number') {
			throw new Error('Arweave addresses cannot be interpreted as a number!');
		}

		return this.toString();
	}

	equals(other: ArweaveAddress): boolean {
		return this.address === other.address;
	}

	toString(): string {
		return this.address;
	}

	valueOf(): string {
		return this.address;
	}

	toJSON(): string {
		return this.toString();
	}
}

export function ADDR(arAddress: string): ArweaveAddress {
	return new ArweaveAddress(arAddress);
}
