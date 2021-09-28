import {
	ArFSEncryptedData,
	CipherType,
	deriveFileKey,
	DriveAuthMode,
	driveEncrypt,
	fileEncrypt
} from 'ardrive-core-js';
import { CipherIV, DataContentType, DriveKey, FileID, FolderID, TransactionID } from './types';

export interface ArFSObjectTransactionData {
	asTransactionData(): string | Buffer;
}

export abstract class ArFSDriveTransactionData implements ArFSObjectTransactionData {
	abstract asTransactionData(): string | Buffer;
}

export class ArFSPublicDriveTransactionData extends ArFSDriveTransactionData {
	constructor(private readonly name: string, private readonly rootFolderId: FolderID) {
		super();
	}
	asTransactionData(): string {
		return JSON.stringify({
			name: this.name,
			rootFolderId: this.rootFolderId
		});
	}
}

export class ArFSPrivateDriveTransactionData extends ArFSDriveTransactionData {
	private constructor(
		readonly cipher: CipherType,
		readonly cipherIV: CipherIV,
		readonly encryptedDriveData: Buffer,
		readonly driveKey: DriveKey,
		readonly driveAuthMode: DriveAuthMode = 'password'
	) {
		super();
	}

	static async from(
		name: string,
		rootFolderId: FolderID,
		driveKey: Buffer
	): Promise<ArFSPrivateDriveTransactionData> {
		const { cipher, cipherIV, data } = await driveEncrypt(
			driveKey,
			Buffer.from(
				JSON.stringify({
					name: name,
					rootFolderId: rootFolderId
				})
			)
		);
		return new ArFSPrivateDriveTransactionData(cipher, cipherIV, data, driveKey);
	}

	asTransactionData(): Buffer {
		return this.encryptedDriveData;
	}
}

export abstract class ArFSFolderTransactionData implements ArFSObjectTransactionData {
	abstract asTransactionData(): string | Buffer;
}

export class ArFSPublicFolderTransactionData extends ArFSFolderTransactionData {
	constructor(private readonly name: string) {
		super();
	}
	asTransactionData(): string {
		return JSON.stringify({
			name: this.name
		});
	}
}

export class ArFSPrivateFolderTransactionData extends ArFSFolderTransactionData {
	private constructor(
		readonly name: string,
		readonly cipher: CipherType,
		readonly cipherIV: CipherIV,
		readonly encryptedFolderData: Buffer
	) {
		super();
	}

	static async from(name: string, driveKey: Buffer): Promise<ArFSPrivateFolderTransactionData> {
		const { cipher, cipherIV, data }: ArFSEncryptedData = await fileEncrypt(
			driveKey,
			Buffer.from(
				JSON.stringify({
					name: name
				})
			)
		);
		return new ArFSPrivateFolderTransactionData(name, cipher, cipherIV, data);
	}

	asTransactionData(): Buffer {
		return this.encryptedFolderData;
	}
}

export abstract class ArFSFileMetadataTransactionData implements ArFSObjectTransactionData {
	abstract asTransactionData(): string | Buffer;
}

export class ArFSPublicFileMetadataTransactionData extends ArFSFileMetadataTransactionData {
	constructor(
		private readonly name: string,
		private readonly size: number,
		private readonly lastModifiedDate: number,
		private readonly dataTxId: TransactionID,
		private readonly dataContentType: DataContentType
	) {
		super();
	}

	asTransactionData(): string {
		return JSON.stringify({
			name: this.name,
			size: this.size,
			lastModifiedDate: this.lastModifiedDate,
			dataTxId: this.dataTxId,
			dataContentType: this.dataContentType
		});
	}
}

export class ArFSPrivateFileMetadataTransactionData extends ArFSFileMetadataTransactionData {
	private constructor(
		readonly cipher: CipherType,
		readonly cipherIV: CipherIV,
		readonly encryptedFileMetadata: Buffer,
		readonly driveAuthMode: DriveAuthMode = 'password'
	) {
		super();
	}

	static async from(
		name: string,
		size: number,
		lastModifiedDate: number,
		dataTxId: TransactionID,
		dataContentType: DataContentType,
		fileId: FileID,
		driveKey: Buffer
	): Promise<ArFSPrivateFileMetadataTransactionData> {
		const fileKey: Buffer = await deriveFileKey(fileId, driveKey);
		const { cipher, cipherIV, data }: ArFSEncryptedData = await fileEncrypt(
			fileKey,
			Buffer.from(
				JSON.stringify({
					name: name,
					size: size,
					lastModifiedDate: lastModifiedDate,
					dataTxId: dataTxId,
					dataContentType: dataContentType
				})
			)
		);
		return new ArFSPrivateFileMetadataTransactionData(cipher, cipherIV, data);
	}

	asTransactionData(): Buffer {
		return this.encryptedFileMetadata;
	}
}

export abstract class ArFSFileDataTransactionData implements ArFSObjectTransactionData {
	abstract asTransactionData(): string | Buffer;
}
export class ArFSPublicFileDataTransactionData extends ArFSFileDataTransactionData {
	constructor(private readonly fileData: Buffer) {
		super();
	}

	asTransactionData(): Buffer {
		return this.fileData;
	}
}

export class ArFSPrivateFileDataTransactionData extends ArFSFileDataTransactionData {
	private constructor(
		readonly cipher: CipherType,
		readonly cipherIV: CipherIV,
		readonly encryptedFileData: Buffer,
		readonly driveAuthMode: DriveAuthMode = 'password'
	) {
		super();
	}

	static async from(fileData: Buffer, fileId: FileID, driveKey: Buffer): Promise<ArFSPrivateFileDataTransactionData> {
		const fileKey: Buffer = await deriveFileKey(fileId, driveKey);
		const { cipher, cipherIV, data }: ArFSEncryptedData = await fileEncrypt(fileKey, fileData);
		return new ArFSPrivateFileDataTransactionData(cipher, cipherIV, data);
	}

	asTransactionData(): string | Buffer {
		return this.encryptedFileData;
	}
}
