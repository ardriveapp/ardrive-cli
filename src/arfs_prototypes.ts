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
import { DataContentType, DriveID, FileID, FolderID, UnixTime } from './types';

export abstract class ArFSObjectMetadataPrototype {
	abstract protectedTags: string[];
	abstract objectData: ArFSObjectTransactionData;
	abstract addTagsToTransaction(transaction: Transaction): void;

	// Implementation should throw if any protected tags are identified
	assertProtectedTags(tags: GQLTagInterface[]): void {
		tags.forEach((tag) => {
			if (this.protectedTags.includes(tag.name)) {
				throw new Error(`Tag ${tag.name} is protected and cannot be used in this context!`);
			}
		});
	}
}

export abstract class ArFSEntityMetaDataPrototype extends ArFSObjectMetadataPrototype {
	readonly unixTime: UnixTime;

	constructor() {
		super();

		// Get the current time so the app can display the "created" data later on
		this.unixTime = new UnixTime(Math.round(Date.now() / 1000));
	}
}

export abstract class ArFSDriveMetaDataPrototype extends ArFSEntityMetaDataPrototype {
	abstract driveId: DriveID;
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
		transaction.addTag('Drive-Id', `${this.driveId}`);
		transaction.addTag('Drive-Privacy', this.privacy);
	}
}

export class ArFSPublicDriveMetaDataPrototype extends ArFSDriveMetaDataPrototype {
	readonly privacy: DrivePrivacy = 'public';
	readonly contentType: ContentType = 'application/json';

	constructor(readonly objectData: ArFSPublicDriveTransactionData, readonly driveId: DriveID) {
		super();
	}
}

export class ArFSPrivateDriveMetaDataPrototype extends ArFSDriveMetaDataPrototype {
	readonly privacy: DrivePrivacy = 'private';
	readonly contentType: ContentType = 'application/octet-stream';

	constructor(readonly driveId: DriveID, readonly objectData: ArFSPrivateDriveTransactionData) {
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
}

export abstract class ArFSFolderMetaDataPrototype extends ArFSEntityMetaDataPrototype {
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
		transaction.addTag('Drive-Id', `${this.driveId}`);
		transaction.addTag('Folder-Id', `${this.folderId}`);
		if (this.parentFolderId) {
			// Root folder transactions do not have Parent-Folder-Id
			transaction.addTag('Parent-Folder-Id', `${this.parentFolderId}`);
		}
	}
}

export class ArFSPublicFolderMetaDataPrototype extends ArFSFolderMetaDataPrototype {
	readonly contentType: ContentType = 'application/json';

	constructor(
		readonly objectData: ArFSPublicFolderTransactionData,
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
}

export abstract class ArFSFileMetaDataPrototype extends ArFSEntityMetaDataPrototype {
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
		transaction.addTag('Drive-Id', `${this.driveId}`);
		transaction.addTag('File-Id', `${this.fileId}`);
		transaction.addTag('Parent-Folder-Id', `${this.parentFolderId}`);
	}
}
export class ArFSPublicFileMetaDataPrototype extends ArFSFileMetaDataPrototype {
	readonly contentType: ContentType = 'application/json';

	constructor(
		readonly objectData: ArFSPublicFileMetadataTransactionData,
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
