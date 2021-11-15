import { Equatable } from './equatable';

export class ByteCount implements Equatable<ByteCount> {
	constructor(private readonly byteCount: number) {
		if (!Number.isFinite(this.byteCount) || !Number.isInteger(this.byteCount) || this.byteCount < 0) {
			throw new Error('Byte count must be a non-negative integer value!');
		}
	}

	[Symbol.toPrimitive](hint?: string): number | string {
		if (hint === 'string') {
			this.toString();
		}

		return this.byteCount;
	}

	toString(): string {
		return `${this.byteCount}`;
	}

	valueOf(): number {
		return this.byteCount;
	}

	toJSON(): number {
		return this.byteCount;
	}

	equals(other: ByteCount): boolean {
		return this.byteCount === other.byteCount;
	}
}
