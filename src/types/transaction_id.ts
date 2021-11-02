const trxIdRegex = /^([a-zA-Z]|[0-9]|-|_){43}$/;

export class TransactionID {
	constructor(private readonly transactionId: string) {
		if (!transactionId.match(trxIdRegex)) {
			throw new Error(
				'Transaction ID should be a 43-character, alphanumeric string potentially including "=" and "_" characters.'
			);
		}
	}

	toString(): string {
		return this.transactionId;
	}

	valueOf(): string {
		return this.transactionId;
	}
}

export function TxID(transactionId: string): TransactionID {
	return new TransactionID(transactionId);
}
