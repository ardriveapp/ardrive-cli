export class ArweaveAddress {
	constructor(private readonly address: string) {
		if (!address.match(new RegExp('^[a-zA-Z0-9_-]{43}$'))) {
			throw new Error(
				'Arweave addresses must be 43 characters in length with characters in the following set: [a-zA-Z0-9_-]'
			);
		}
	}

	toString(): string {
		return this.address;
	}

	valueOf(): string {
		return this.address;
	}
}
