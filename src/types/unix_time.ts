export class UnixTime {
	constructor(private readonly unixTime: number) {
		if (this.unixTime < 0 || !Number.isInteger(this.unixTime) || !Number.isFinite(this.unixTime)) {
			throw new Error('Unix time must be a positive integer!');
		}
	}

	[Symbol.toPrimitive](hint?: string): number | string {
		if (hint === 'string') {
			this.toString();
		}

		return this.unixTime;
	}

	toString(): string {
		return `${this.unixTime}`;
	}

	valueOf(): number {
		return this.unixTime;
	}

	toJSON(): number {
		return this.unixTime;
	}
}
