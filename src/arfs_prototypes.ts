import {
	ArFSDriveTransactionData,
	ArFSFileDataTransactionData,
	ArFSFileMetadataTransactionData,
	ArFSFolderTransactionData,
	ArFSObjectTransactionData,
	ArFSPrivateDriveTransactionData,
	ArFSPrivateFileDataTransactionData,
	ArFSPrivateFileMetadataTransactionData,
	ArFSPrivateFolderTransactionData,
	ArFSPublicDriveTransactionData,
	ArFSPublicFileDataTransactionData,
	ArFSPublicFileMetadataTransactionData,
	ArFSPublicFolderTransactionData
} from './arfs_trx_data_types';
import Transaction from 'arweave/node/lib/transaction';
import { ContentType, DrivePrivacy, GQLTagInterface } from 'ardrive-core-js';
import { DataContentType, DriveID, FileID, FolderID } from './types';

export abstract class ArFSObjectMetadataPrototype {
	abstract protectedTags: string[];
	abstract objectData: ArFSObjectTransactionData;
	abstract addTagsToTransaction(transaction: Transaction): void;
	abstract addTagsToDataItem(tags: GQLTagInterface[]): void;

	// Implementation should throw if any protected tags are identified
	assertProtectedTags(tags: GQLTagInterface[]): void {
		tags.forEach((tag) => {
			if (this.protectedTags.includes(tag.name)) {
				throw new Error(`Tag ${tag.name} is protected and cannot be used in this context!`);
			}
		});
	}
}

export abstract class ArFSDriveMetaDataPrototype extends ArFSObjectMetadataPrototype {
	abstract unixTime: number;
	abstract driveId: string;
	abstract objectData: ArFSDriveTransactionData;
	abstract readonly privacy: DrivePrivacy;
	abstract readonly contentType: ContentType;

	get protectedTags(): string[] {
		return ['Content-Type', 'Entity-Type', 'Unix-Time', 'Drive-Id', 'Drive-Privacy'];
	}

	addTagsToTransaction(transaction: Transaction): void {
		transaction.addTag('Content-Type', this.contentType);
		transaction.addTag('Entity-Type', 'drive');
		transaction.addTag('Unix-Time', this.unixTime.toString());
		transaction.addTag('Drive-Id', this.driveId);
		transaction.addTag('Drive-Privacy', this.privacy);
	}

	addTagsToDataItem(tags: GQLTagInterface[]): void {
		tags.push({ name: 'Content-Type', value: this.contentType });
		tags.push({ name: 'Entity-Type', value: 'drive' });
		tags.push({ name: 'Unix-Time', value: this.unixTime.toString() });
		tags.push({ name: 'Drive-Id', value: this.driveId });
		tags.push({ name: 'Drive-Privacy', value: this.privacy });
	}
}

export class ArFSPublicDriveMetaDataPrototype extends ArFSDriveMetaDataPrototype {
	readonly privacy: DrivePrivacy = 'public';
	readonly contentType: ContentType = 'application/json';

	get protectedTags(): string[] {
		return ['Content-Type', ...super.protectedTags];
	}

	constructor(
		readonly objectData: ArFSPublicDriveTransactionData,
		readonly unixTime: number,
		readonly driveId: string
	) {
		super();
	}

	addTagsToTransaction(transaction: Transaction): void {
		super.addTagsToTransaction(transaction);
		// transaction.addTag('Content-Type', 'application/json');
	}

	addTagsToDataItem(tags: GQLTagInterface[]): void {
		super.addTagsToDataItem(tags);
		// tags.push({ name: 'Content-Type', value: 'application/json' });
	}
}

export class ArFSPrivateDriveMetaDataPrototype extends ArFSDriveMetaDataPrototype {
	readonly privacy: DrivePrivacy = 'private';
	readonly contentType: ContentType = 'application/octet-stream';

	constructor(
		readonly unixTime: number,
		readonly driveId: string,
		readonly objectData: ArFSPrivateDriveTransactionData
	) {
		super();
	}

	get protectedTags(): string[] {
		return ['Cipher', 'Cipher-IV', 'Drive-Auth-Mode', ...super.protectedTags];
	}

	addTagsToTransaction(transaction: Transaction): void {
		super.addTagsToTransaction(transaction);
		transaction.addTag('Cipher', this.objectData.cipher);
		transaction.addTag('Cipher-IV', this.objectData.cipherIV);
		transaction.addTag('Drive-Auth-Mode', this.objectData.driveAuthMode);
	}

	addTagsToDataItem(tags: GQLTagInterface[]): void {
		super.addTagsToDataItem(tags);
		tags.push({ name: 'Cipher', value: this.objectData.cipher });
		tags.push({ name: 'Cipher-IV', value: this.objectData.cipherIV });
		tags.push({ name: 'Drive-Auth-Mode', value: this.objectData.driveAuthMode });
	}
}

export abstract class ArFSFolderMetaDataPrototype extends ArFSObjectMetadataPrototype {
	abstract unixTime: number;
	abstract driveId: DriveID;
	abstract folderId: FolderID;
	abstract objectData: ArFSFolderTransactionData;
	abstract parentFolderId?: FolderID;
	abstract readonly contentType: ContentType;

	get protectedTags(): string[] {
		return ['Content-Type', 'Entity-Type', 'Unix-Time', 'Drive-Id', 'Folder-Id', 'Parent-Folder-Id'];
	}

	addTagsToTransaction(transaction: Transaction): void {
		transaction.addTag('Content-Type', this.contentType);
		transaction.addTag('Entity-Type', 'folder');
		transaction.addTag('Unix-Time', this.unixTime.toString());
		transaction.addTag('Drive-Id', this.driveId);
		transaction.addTag('Folder-Id', this.folderId);
		if (this.parentFolderId) {
			// Root folder transactions do not have Parent-Folder-Id
			transaction.addTag('Parent-Folder-Id', this.parentFolderId);
		}
	}

	addTagsToDataItem(tags: GQLTagInterface[]): void {
		tags.push({ name: 'Content-Type', value: this.contentType });
		tags.push({ name: 'Entity-Type', value: 'folder' });
		tags.push({ name: 'Unix-Time', value: this.unixTime.toString() });
		tags.push({ name: 'Drive-Id', value: this.driveId });
		tags.push({ name: 'Folder-Id', value: this.folderId });
		if (this.parentFolderId) {
			// Root folder transactions do not have Parent-Folder-Id
			tags.push({ name: 'Parent-Folder-Id', value: this.parentFolderId });
		}
	}
}

export class ArFSPublicFolderMetaDataPrototype extends ArFSFolderMetaDataPrototype {
	readonly contentType: ContentType = 'application/json';

	constructor(
		readonly objectData: ArFSPublicFolderTransactionData,
		readonly unixTime: number,
		readonly driveId: DriveID,
		readonly folderId: FolderID,
		readonly parentFolderId?: FolderID
	) {
		super();
	}
}

export class ArFSPrivateFolderMetaDataPrototype extends ArFSFolderMetaDataPrototype {
	readonly privacy: DrivePrivacy = 'private';
	readonly contentType: ContentType = 'application/octet-stream';

	constructor(
		readonly unixTime: number,
		readonly driveId: DriveID,
		readonly folderId: FolderID,
		readonly objectData: ArFSPrivateFolderTransactionData,
		readonly parentFolderId?: FolderID
	) {
		super();
	}

	get protectedTags(): string[] {
		return ['Cipher', 'Cipher-IV', ...super.protectedTags];
	}

	addTagsToTransaction(transaction: Transaction): void {
		super.addTagsToTransaction(transaction);
		transaction.addTag('Cipher', this.objectData.cipher);
		transaction.addTag('Cipher-IV', this.objectData.cipherIV);
	}

	addTagsToDataItem(tags: GQLTagInterface[]): void {
		super.addTagsToDataItem(tags);
		tags.push({ name: 'Cipher', value: this.objectData.cipher });
		tags.push({ name: 'Cipher-IV', value: this.objectData.cipherIV });
	}
}

export abstract class ArFSFileMetaDataPrototype extends ArFSObjectMetadataPrototype {
	abstract unixTime: number;
	abstract driveId: DriveID;
	abstract fileId: FileID;
	abstract objectData: ArFSFileMetadataTransactionData;
	abstract parentFolderId: FolderID;
	abstract contentType: ContentType;

	get protectedTags(): string[] {
		return ['Content-Type', 'Entity-Type', 'Unix-Time', 'Drive-Id', 'File-Id', 'Parent-Folder-Id'];
	}

	addTagsToTransaction(transaction: Transaction): void {
		transaction.addTag('Content-Type', this.contentType);
		transaction.addTag('Entity-Type', 'file');
		transaction.addTag('Unix-Time', this.unixTime.toString());
		transaction.addTag('Drive-Id', this.driveId);
		transaction.addTag('File-Id', this.fileId);
		transaction.addTag('Parent-Folder-Id', this.parentFolderId);
	}

	addTagsToDataItem(tags: GQLTagInterface[]): void {
		tags.push({ name: 'Content-Type', value: this.contentType });
		tags.push({ name: 'Entity-Type', value: 'file' });
		tags.push({ name: 'Unix-Time', value: this.unixTime.toString() });
		tags.push({ name: 'Drive-Id', value: this.driveId });
		tags.push({ name: 'File-Id', value: this.fileId });
		tags.push({ name: 'Parent-Folder-Id', value: this.parentFolderId });
	}
}
export class ArFSPublicFileMetaDataPrototype extends ArFSFileMetaDataPrototype {
	readonly contentType: ContentType = 'application/json';

	constructor(
		readonly objectData: ArFSPublicFileMetadataTransactionData,
		readonly unixTime: number,
		readonly driveId: DriveID,
		readonly fileId: FileID,
		readonly parentFolderId: FolderID
	) {
		super();
	}
}

export class ArFSPrivateFileMetaDataPrototype extends ArFSFileMetaDataPrototype {
	readonly contentType: ContentType = 'application/octet-stream';

	constructor(
		readonly objectData: ArFSPrivateFileMetadataTransactionData,
		readonly unixTime: number,
		readonly driveId: DriveID,
		readonly fileId: FileID,
		readonly parentFolderId: FolderID
	) {
		super();
	}

	get protectedTags(): string[] {
		return ['Cipher', 'Cipher-IV', ...super.protectedTags];
	}

	addTagsToTransaction(transaction: Transaction): void {
		super.addTagsToTransaction(transaction);
		transaction.addTag('Cipher', this.objectData.cipher);
		transaction.addTag('Cipher-IV', this.objectData.cipherIV);
	}

	addTagsToDataItem(tags: GQLTagInterface[]): void {
		super.addTagsToDataItem(tags);
		tags.push({ name: 'Cipher', value: this.objectData.cipher });
		tags.push({ name: 'Cipher-IV', value: this.objectData.cipherIV });
	}
}

export abstract class ArFSFileDataPrototype extends ArFSObjectMetadataPrototype {
	abstract readonly objectData: ArFSFileDataTransactionData;
	abstract readonly contentType: DataContentType | 'application/octet-stream';

	get protectedTags(): string[] {
		return ['Content-Type'];
	}

	addTagsToTransaction(transaction: Transaction): void {
		transaction.addTag('Content-Type', this.contentType);
	}

	addTagsToDataItem(tags: GQLTagInterface[]): void {
		tags.push({ name: 'Content-Type', value: this.contentType });
	}
}

export class ArFSPublicFileDataPrototype extends ArFSFileDataPrototype {
	constructor(readonly objectData: ArFSPublicFileDataTransactionData, readonly contentType: DataContentType) {
		super();
	}
}

export class ArFSPrivateFileDataPrototype extends ArFSFileDataPrototype {
	readonly contentType = 'application/octet-stream';
	constructor(readonly objectData: ArFSPrivateFileDataTransactionData) {
		super();
	}

	get protectedTags(): string[] {
		return ['Cipher', 'Cipher-IV', ...super.protectedTags];
	}

	addTagsToTransaction(transaction: Transaction): void {
		super.addTagsToTransaction(transaction);
		transaction.addTag('Cipher', this.objectData.cipher);
		transaction.addTag('Cipher-IV', this.objectData.cipherIV);
	}
}
