export class ArweaveAddress {
	constructor(private readonly address: string) {
		if (!address.match(new RegExp('^[a-zA-Z0-9_-]{43}$'))) {
			throw new Error(
				'Arweave addresses may only contain characters in the following character set: [a-zA-Z0-9_-]'
			);
		}
	}

	public toString(): string {
		return this.address;
	}
}
