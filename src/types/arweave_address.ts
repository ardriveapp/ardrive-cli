export class ArweaveAddress {
	constructor(private readonly address: string) {
		if (!address.match(new RegExp('^[a-zA-Z0-9_-]{43}$'))) {
			throw new Error(
				'Arweave addresses must be 43 characters in length with characters in the following set: [a-zA-Z0-9_-]'
			);
		}
	}

	[Symbol.toPrimitive](hint: 'number' | 'string' | 'default'): string {
		if (hint === 'number') {
			throw new Error('Address is a string!!!!');
		}
		return this.address;
	}

	equalsAddress(other: ArweaveAddress): boolean {
		return `${this}` === `${other}`;
	}

	toString(): string {
		// calls the toPrimitive symbol
		return `${this}`;
	}
}
