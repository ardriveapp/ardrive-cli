import {
	ContentType,
	deriveDriveKey,
	deriveFileKey,
	fileDecrypt,
	GQLTagInterface,
	Utf8ArrayToStr
} from 'ardrive-core-js';
import Arweave from 'arweave';
import { ArFSPrivateFile, ArFSPublicFile } from '../../arfsdao';
import { DriveKey, FileID, TransactionID } from '../../types';
import { JWKWallet } from '../../wallet_new';
import { ArFSFileOrFolderBuilder } from './arfs_builders';

export abstract class ArFSFileBuilder<T extends ArFSPublicFile | ArFSPrivateFile> extends ArFSFileOrFolderBuilder<T> {
	size?: number;
	lastModifiedDate?: number;
	dataTxId?: TransactionID;
	dataContentType?: ContentType;

	getGqlQueryParameters(): GQLTagInterface[] {
		return [
			{ name: 'File-Id', value: this.entityId },
			{ name: 'Entity-Type', value: 'file' }
		];
	}
}

export class ArFSPublicFileBuilder extends ArFSFileBuilder<ArFSPublicFile> {
	protected async buildEntity(): Promise<ArFSPublicFile> {
		if (
			this.appName?.length &&
			this.appVersion?.length &&
			this.arFS?.length &&
			this.contentType?.length &&
			this.driveId?.length &&
			this.entityType?.length &&
			this.txId?.length &&
			this.unixTime &&
			this.parentFolderId?.length &&
			this.entityId?.length
		) {
			const txData = await this.arweave.transactions.getData(this.txId, { decode: true });
			const dataString = await Utf8ArrayToStr(txData);
			const dataJSON = await JSON.parse(dataString);

			// Get the file name
			this.name = dataJSON.name;
			if (!this.name) {
				throw new Error('Invalid file state');
			}

			// TODO: WHY IS THE ArFSPublicFile type missing these fields?
			this.size = dataJSON.size;
			this.lastModifiedDate = dataJSON.lastModifiedDate;
			this.dataTxId = dataJSON.dataTxId;
			this.dataContentType = dataJSON.dataContentType;

			return Promise.resolve(
				new ArFSPublicFile(
					this.appName,
					this.appVersion,
					this.arFS,
					this.contentType,
					this.driveId,
					this.entityType,
					this.name,
					this.txId,
					this.unixTime,
					this.parentFolderId,
					this.entityId
				)
			);
		}
		throw new Error('Invalid file state');
	}
}

export class ArFSPrivateFileBuilder extends ArFSFileBuilder<ArFSPrivateFile> {
	cipher?: string;
	cipherIV?: string;

	constructor(
		readonly fileID: FileID,
		readonly arweave: Arweave,
		protected readonly wallet: JWKWallet,
		protected readonly drivePassword: string
	) {
		super(fileID, arweave);
	}

	protected async parseFromArweave(): Promise<GQLTagInterface[]> {
		const unparsedTags: GQLTagInterface[] = [];
		const tags = await super.parseFromArweave();
		tags.forEach((tag: GQLTagInterface) => {
			const key = tag.name;
			const { value } = tag;
			switch (key) {
				case 'Cipher-IV':
					this.cipherIV = value;
					break;
				case 'Cipher':
					this.cipher = value;
					break;
				default:
					unparsedTags.push(tag);
					break;
			}
		});
		return unparsedTags;
	}

	protected async buildEntity(): Promise<ArFSPrivateFile> {
		if (
			this.appName?.length &&
			this.appVersion?.length &&
			this.arFS?.length &&
			this.contentType?.length &&
			this.driveId?.length &&
			this.entityType?.length &&
			this.txId?.length &&
			this.unixTime &&
			this.parentFolderId?.length &&
			this.entityId?.length &&
			this.cipher?.length &&
			this.cipherIV?.length
		) {
			const txData = await this.arweave.transactions.getData(this.txId, { decode: true });
			const dataBuffer = Buffer.from(txData);
			const driveKey: DriveKey = await deriveDriveKey(
				this.drivePassword,
				this.driveId,
				JSON.stringify(this.wallet.getPrivateKey())
			);
			const fileKey = await deriveFileKey(this.fileID, driveKey);

			const decryptedFileBuffer: Buffer = await fileDecrypt(this.cipherIV, fileKey, dataBuffer);
			const decryptedFileString: string = await Utf8ArrayToStr(decryptedFileBuffer);
			const decryptedFileJSON = await JSON.parse(decryptedFileString);

			// Get the file name
			this.name = decryptedFileJSON.name;
			if (!this.name) {
				throw new Error('Invalid file state');
			}

			// TODO: WHY IS THE ArFSPrivateFile type missing these fields?
			this.size = decryptedFileJSON.size;
			this.lastModifiedDate = decryptedFileJSON.lastModifiedDate;
			this.dataTxId = decryptedFileJSON.dataTxId;
			this.dataContentType = decryptedFileJSON.dataContentType;

			return new ArFSPrivateFile(
				this.appName,
				this.appVersion,
				this.arFS,
				this.contentType,
				this.driveId,
				this.entityType,
				this.name,
				this.txId,
				this.unixTime,
				this.parentFolderId,
				this.entityId,
				this.cipher,
				this.cipherIV
			);
		}
		throw new Error('Invalid file state');
	}
}
