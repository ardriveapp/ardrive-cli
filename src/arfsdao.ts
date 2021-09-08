import type { JWKWallet, Wallet } from './wallet_new';
import Arweave from 'arweave';
import { v4 as uuidv4 } from 'uuid';
import Transaction from 'arweave/node/lib/transaction';
import {
	ArFSEncryptedData,
	CipherType,
	deriveDriveKey,
	DriveAuthMode,
	driveEncrypt,
	DrivePrivacy,
	GQLTagInterface,
	JWKInterface
} from 'ardrive-core-js';

export const ArFS_O_11 = '0.11';

export type CipherIV = string;
export type FolderID = string;
export type DriveID = string;

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
		//readonly name: string,
		//readonly rootFolderId: FolderID,
		readonly cipher: CipherType,
		readonly cipherIV: CipherIV,
		readonly encryptedDriveData: Buffer,
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
		return new ArFSPrivateDriveData(/*name, rootFolderId,*/ cipher, cipherIV, data);
	}

	asTransactionData(): string | Buffer {
		return this.encryptedDriveData;
	}
}

export abstract class ArFSObjectMetadataPrototype {
	abstract protectedTags: string[];
	abstract objectData: ArFSObjectTransactionData;
	abstract addTagsToTransaction(transaction: Transaction): void;

	// Implementation should throw if any protected tags are identified
	assertProtectedTags(tags: GQLTagInterface[]): void {
		tags.forEach((tag) => {
			if (this.protectedTags.indexOf(tag.name) != -1) {
				throw new Error(`Tag ${tag.name} is protected and cannot be used in this context!`);
			}
		});
	}
}

export abstract class ArFSDriveMetaDataPrototype extends ArFSObjectMetadataPrototype {
	//abstract driveName: string;
	//abstract rootFolderId: string;
	abstract unixTime: number;
	abstract driveId: string;
	abstract objectData: ArFSObjectTransactionData;
	abstract readonly privacy: DrivePrivacy;

	get protectedTags(): string[] {
		return ['Entity-Type', 'Unix-Time', 'Drive-Id', 'Drive-Privacy'];
	}

	addTagsToTransaction(transaction: Transaction): void {
		transaction.addTag('Entity-Type', 'drive');
		transaction.addTag('Unix-Time', this.unixTime.toString());
		transaction.addTag('Drive-Id', this.driveId);
		transaction.addTag('Drive-Privacy', this.privacy);
	}
}

export class ArFSPublicDriveMetaDataPrototype extends ArFSDriveMetaDataPrototype {
	readonly privacy: DrivePrivacy = 'public';

	get protectedTags(): string[] {
		return ['Content-Type', ...super.protectedTags];
	}

	constructor(readonly objectData: ArFSPublicDriveData, readonly unixTime: number, readonly driveId: string) {
		super();
	}

	/*get driveName(): string {
		return this.driveData.name;
	}

	get rootFolderId(): FolderID {
		return this.driveData.rootFolderId;
	}*/

	addTagsToTransaction(transaction: Transaction): void {
		super.addTagsToTransaction(transaction);
		transaction.addTag('Content-Type', 'application/json');
	}
}

export class ArFSPrivateDriveMetaDataPrototype extends ArFSDriveMetaDataPrototype {
	readonly privacy: DrivePrivacy = 'private';

	constructor(
		//readonly driveName: string,
		//readonly rootFolderId: string,
		readonly unixTime: number,
		readonly driveId: string,
		readonly objectData: ArFSPrivateDriveData
	) {
		super();
	}

	addTagsToTransaction(transaction: Transaction): void {
		super.addTagsToTransaction(transaction);
		transaction.addTag('Content-Type', 'application/octet-stream');
		transaction.addTag('Cipher', this.objectData.cipher);
		transaction.addTag('Cipher-IV', this.objectData.cipherIV);
		transaction.addTag('Drive-Auth-Mode', this.objectData.driveAuthMode);
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
		const { cipher, cipherIV, data }: ArFSEncryptedData = await driveEncrypt(
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

export abstract class ArFSFolderMetaDataPrototype extends ArFSObjectMetadataPrototype {
	//abstract folderName: string;
	//abstract rootFolderId: string;
	abstract unixTime: number;
	abstract driveId: DriveID;
	abstract folderId: FolderID;
	abstract objectData: ArFSObjectTransactionData;
	abstract parentFolderId?: FolderID;
	abstract readonly privacy: DrivePrivacy;

	get protectedTags(): string[] {
		return ['Entity-Type', 'Unix-Time', 'Drive-Id', 'Folder-Id', 'Drive-Privacy', 'Parent-Folder-Id'];
	}

	addTagsToTransaction(transaction: Transaction): void {
		transaction.addTag('Entity-Type', 'folder');
		transaction.addTag('Unix-Time', this.unixTime.toString());
		transaction.addTag('Drive-Id', this.driveId);
		transaction.addTag('Folder-Id', this.folderId);
		transaction.addTag('Drive-Privacy', this.privacy);
		if (this.parentFolderId) {
			// Root folder transactions do not have Parent-Folder-Id
			transaction.addTag('Parent-Folder-Id', this.parentFolderId);
		}
	}
}

export class ArFSPublicFolderMetaDataPrototype extends ArFSFolderMetaDataPrototype {
	readonly privacy: DrivePrivacy = 'public';

	constructor(
		readonly objectData: ArFSPublicFolderData,
		readonly unixTime: number,
		readonly driveId: DriveID,
		readonly folderId: FolderID,
		readonly parentFolderId?: FolderID
	) {
		super();
	}

	get protectedTags(): string[] {
		return ['Content-Type', ...super.protectedTags];
	}

	/*get folderName(): string {
		return this.folderData.name;
	}

	get rootFolderId(): FolderID {
		return this.folderData.rootFolderId;
	}*/

	addTagsToTransaction(transaction: Transaction): void {
		super.addTagsToTransaction(transaction);
		transaction.addTag('Content-Type', 'application/json');
	}
}

export class ArFSPrivateFolderMetaDataPrototype extends ArFSFolderMetaDataPrototype {
	readonly privacy: DrivePrivacy = 'private';

	constructor(
		//readonly folderName: string,
		//readonly rootFolderId: string,
		readonly unixTime: number,
		readonly driveId: DriveID,
		readonly folderId: FolderID,
		readonly objectData: ArFSPrivateFolderData,
		readonly parentFolderId?: FolderID
	) {
		super();
	}

	addTagsToTransaction(transaction: Transaction): void {
		super.addTagsToTransaction(transaction);
		transaction.addTag('Content-Type', 'application/octet-stream');
		transaction.addTag('Cipher', this.objectData.cipher);
		transaction.addTag('Cipher-IV', this.objectData.cipherIV);
		transaction.addTag('Drive-Auth-Mode', this.objectData.driveAuthMode);
	}
}

// TODO: Extend rather than union type?
export type ArFSDriveMetaData =
	| ArFSDriveMetaDataPrototype
	| {
			appName: string;
			appVersion: string;
	  };

export class ArFSDAO {
	// TODO: Can we abstract Arweave type(s)?
	constructor(private readonly wallet: Wallet, private readonly arweave: Arweave) {
		// eslint-disable-next-line no-console
		console.log(this.wallet, arweave);
	}

	// TODO: RETURN ALL TRANSACTION DATA
	//createDrive(driveName: string): Promise<Transaction[]> {
	createPublicDrive(driveName: string): Promise<void> {
		// Generate a new drive ID  for the new drive
		const driveId = uuidv4();

		// Generate a root folder ID for the new drive
		const rootFolderId = uuidv4();

		// Get the current time so the app can display the "created" data later on
		const unixTime = Math.round(Date.now() / 1000);

		// TODO: CREATE A ROOT FOLDER METADATA TRANSACTION AND USE ROOT FOLDER ID IN FIXMEJSON BELOW!

		// Create a drive metadata transaction
		const driveMetaData = new ArFSPublicDriveMetaDataPrototype(
			new ArFSPublicDriveData(driveName, rootFolderId),
			unixTime,
			driveId
		);
		const driveTrx = this.prepareArFSObjectTransaction(driveMetaData);

		// eslint-disable-next-line no-console
		console.log(rootFolderId, unixTime);

		// eslint-disable-next-line no-console
		console.log(driveName, driveId);
		return Promise.resolve();
	}

	async prepareArFSObjectTransaction(
		objectMetaData: ArFSObjectMetadataPrototype,
		appName = 'ArDrive-Core',
		appVersion = '1.0',
		arFSVersion = ArFS_O_11,
		otherTags: GQLTagInterface[] = []
	): Promise<Transaction> {
		const wallet = this.wallet as JWKWallet;

		// Create transaction
		const transaction = await this.arweave.createTransaction(
			{ data: objectMetaData.objectData.asTransactionData() },
			wallet.getPrivateKey()
		);

		// Add baseline ArFS Tags
		transaction.addTag('App-Name', appName);
		transaction.addTag('App-Version', appVersion);
		transaction.addTag('ArFS', arFSVersion);

		// Add object-specific tags
		objectMetaData.addTagsToTransaction(transaction);

		// Enforce that other tags are not protected
		objectMetaData.assertProtectedTags(otherTags);
		otherTags.forEach((tag) => {
			transaction.addTag(tag.name, tag.value);
		});

		// Sign the transaction
		await this.arweave.transactions.sign(transaction, wallet.getPrivateKey());
		return transaction;
	}
}
