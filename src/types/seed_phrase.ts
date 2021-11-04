import { Equatable } from './equatable';

const seedPhraseRegex =/^(\b[a-z]+\b(\s+\b|$)){12}$/i;

export class SeedPhrase implements Equatable<SeedPhrase> {
	constructor(private readonly seedPhrase: string) {
		if (!this.seedPhrase.match(seedPhraseRegex)) {
			throw new Error(`'${this.seedPhrase}' is not a valid 12 word seed phrase!`);
		}
	}

	[Symbol.toPrimitive](hint?: string): string {
		if (hint === 'number') {
			throw new Error('Seed phrase cannot be interpreted as a number!');
		}

		return this.toString();
	}

	toString(): string {
		return this.seedPhrase;
	}

	valueOf(): string {
		return this.seedPhrase;
	}

	toJSON(): string {
		return this.toString();
	}

	equals(other: SeedPhrase): boolean {
		return this.seedPhrase === other.seedPhrase;
	}
}
