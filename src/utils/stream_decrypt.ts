import { createDecipheriv } from 'crypto';
import { Transform } from 'stream';
import { CipherIV, FileKey } from '../types';

const algo = 'aes-256-gcm'; // crypto library does not accept this in uppercase. So gotta keep using aes-256-gcm
const authTagLength = 16;

export class StreamDecrypt extends Transform {
	private encryptedData: Buffer = Buffer.from('');

	constructor(private readonly cipherIV: CipherIV, private readonly fileKey: FileKey) {
		super();
		// this.cork();
	}

	_transform(chunk: Buffer, encoding: string, next: () => void): void {
		if (encoding !== 'buffer') {
			throw new Error('The encoding is not a buffer!');
		}
		this.encryptedData = Buffer.concat([this.encryptedData, chunk]);
		next();
	}

	_flush(next: () => void): void {
		const authTag: Buffer = this.encryptedData.slice(
			this.encryptedData.byteLength - authTagLength,
			this.encryptedData.byteLength
		);
		const encryptedDataSlice: Buffer = this.encryptedData.slice(0, this.encryptedData.byteLength - authTagLength);
		const iv: Buffer = Buffer.from(this.cipherIV, 'base64');
		const decipher = createDecipheriv(algo, this.fileKey, iv, { authTagLength });
		decipher.setAuthTag(authTag);
		debugger;
		const decryptedFile: Buffer = Buffer.concat([decipher.update(encryptedDataSlice), decipher.final()]);
		this.push(decryptedFile);
		next();
	}
}
