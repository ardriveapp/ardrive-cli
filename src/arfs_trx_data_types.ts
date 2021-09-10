import {
	ArFSEncryptedData,
	CipherType,
	deriveDriveKey,
	DriveAuthMode,
	driveEncrypt,
	fileEncrypt,
	JWKInterface
} from 'ardrive-core-js';
import { CipherIV, DataContentType, DriveID, DriveKey, FolderID, TransactionID } from './arfsdao';

export interface ArFSObjectTransactionData {
	asTransactionData(): string | Buffer;
}

export class ArFSPublicDriveData implements ArFSObjectTransactionData {
	constructor(readonly name: string, readonly rootFolderId: FolderID) {}
	asTransactionData(): string | Buffer {
		return JSON.stringify({
			name: this.name,
			rootFolderId: this.rootFolderId
		});
	}
}

export class ArFSPrivateDriveData implements ArFSObjectTransactionData {
	private constructor(
		readonly cipher: CipherType,
		readonly cipherIV: CipherIV,
		readonly encryptedDriveData: Buffer,
		readonly driveKey: DriveKey,
		readonly driveAuthMode: DriveAuthMode = 'password'
	) {}

	static async createArFSPrivateDriveData(
		name: string,
		rootFolderId: FolderID,
		driveId: DriveID,
		drivePassword: string,
		privateKey: JWKInterface
	): Promise<ArFSPrivateDriveData> {
		const driveKey: Buffer = await deriveDriveKey(drivePassword, driveId, JSON.stringify(privateKey));
		const { cipher, cipherIV, data } = await driveEncrypt(
			driveKey,
			Buffer.from(
				JSON.stringify({
					name: name,
					rootFolderId: rootFolderId
				})
			)
		);
		return new ArFSPrivateDriveData(cipher, cipherIV, data, driveKey);
	}

	asTransactionData(): string | Buffer {
		return this.encryptedDriveData;
	}
}

export class ArFSPublicFolderData implements ArFSObjectTransactionData {
	constructor(readonly name: string) {}
	asTransactionData(): string | Buffer {
		return JSON.stringify({
			name: this.name
		});
	}
}

export class ArFSPublicFileData implements ArFSObjectTransactionData {
	constructor(
		readonly name: string,
		readonly size: number,
		readonly lastModifiedDate: number,
		readonly dataTxId: TransactionID,
		readonly dataContentType: DataContentType
	) {}

	asTransactionData(): string | Buffer {
		return JSON.stringify({
			name: this.name,
			size: this.size,
			lastModifiedDate: this.lastModifiedDate,
			dataTxId: this.dataTxId,
			dataContentType: this.dataContentType
		});
	}
}

// TODO: FIND A BETTER NAME OR UNIFY
export class ArFSFileData implements ArFSObjectTransactionData {
	constructor(readonly data: Buffer) {}

	asTransactionData(): Buffer {
		return this.data;
	}
}

export class ArFSPrivateFolderData implements ArFSObjectTransactionData {
	private constructor(
		readonly name: string,
		readonly cipher: CipherType,
		readonly cipherIV: CipherIV,
		readonly encryptedFolderData: Buffer,
		readonly driveAuthMode: DriveAuthMode = 'password'
	) {}

	static async createArFSPrivateFolderData(
		name: string,
		driveId: DriveID,
		drivePassword: string,
		privateKey: JWKInterface
	): Promise<ArFSPrivateFolderData> {
		const driveKey: Buffer = await deriveDriveKey(drivePassword, driveId, JSON.stringify(privateKey));
		const { cipher, cipherIV, data }: ArFSEncryptedData = await fileEncrypt(
			driveKey,
			Buffer.from(
				JSON.stringify({
					name: name
				})
			)
		);
		return new ArFSPrivateFolderData(name, cipher, cipherIV, data);
	}

	asTransactionData(): string | Buffer {
		return this.encryptedFolderData;
	}
}
