import * as fs from 'fs';
import type { JWKWallet, Wallet } from './wallet_new';
import Arweave from 'arweave';
import { v4 as uuidv4 } from 'uuid';
import Transaction from 'arweave/node/lib/transaction';
import {
	ArFSDriveEntity,
	ArFSEncryptedData,
	CipherType,
	deriveDriveKey,
	DriveAuthMode,
	driveEncrypt,
	DrivePrivacy,
	fileEncrypt,
	GQLEdgeInterface,
	GQLTagInterface,
	JWKInterface
} from 'ardrive-core-js';

export const ArFS_O_11 = '0.11';

export type CipherIV = string;
export type FolderID = string;
export type FileID = string;
export type DriveID = string;
export type DriveKey = Buffer;

export const graphQLURL = 'https://arweave.net/graphql';

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

export abstract class ArFSDriveMetaDataPrototype extends ArFSObjectMetadataPrototype {
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

	addTagsToTransaction(transaction: Transaction): void {
		super.addTagsToTransaction(transaction);
		transaction.addTag('Content-Type', 'application/json');
	}
}

export class ArFSPrivateDriveMetaDataPrototype extends ArFSDriveMetaDataPrototype {
	readonly privacy: DrivePrivacy = 'private';

	constructor(readonly unixTime: number, readonly driveId: string, readonly objectData: ArFSPrivateDriveData) {
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

export class ArFSPublicFileData implements ArFSObjectTransactionData {
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

export abstract class ArFSFolderMetaDataPrototype extends ArFSObjectMetadataPrototype {
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

export abstract class ArFSFileMetaDataPrototype extends ArFSObjectMetadataPrototype {
	abstract unixTime: number;
	abstract driveId: DriveID;
	abstract fileId: FileID;
	abstract objectData: ArFSObjectTransactionData;
	abstract parentFolderId: FolderID;
	abstract readonly privacy: DrivePrivacy;

	get protectedTags(): string[] {
		return ['Entity-Type', 'Unix-Time', 'Drive-Id', 'File-Id', 'Drive-Privacy', 'Parent-Folder-Id'];
	}

	addTagsToTransaction(transaction: Transaction): void {
		transaction.addTag('Entity-Type', 'file');
		transaction.addTag('Unix-Time', this.unixTime.toString());
		transaction.addTag('Drive-Id', this.driveId);
		transaction.addTag('File-Id', this.fileId);
		transaction.addTag('Drive-Privacy', this.privacy);
		transaction.addTag('Parent-Folder-Id', this.parentFolderId);
	}
}

export class ArFSPublicFileMetaDataPrototype extends ArFSFileMetaDataPrototype {
	readonly privacy: DrivePrivacy = 'public';

	constructor(
		readonly objectData: ArFSPublicFileData,
		readonly unixTime: number,
		readonly driveId: DriveID,
		readonly fileId: FileID,
		readonly parentFolderId: FolderID
	) {
		super();
	}

	get protectedTags(): string[] {
		return ['Content-Type', ...super.protectedTags];
	}

	addTagsToTransaction(transaction: Transaction): void {
		super.addTagsToTransaction(transaction);
		transaction.addTag('Content-Type', 'application/json');
	}
}

// TODO: Extend rather than union type?
export type ArFSDriveMetaData =
	| ArFSDriveMetaDataPrototype
	| {
			appName: string;
			appVersion: string;
	  };

export interface ArFSCreateDriveResult {
	driveTrx: Transaction;
	rootFolderTrx: Transaction;
	driveId: DriveID;
	rootFolderId: FolderID;
}

export interface ArFSCreateFolderResult {
	folderTrx: Transaction;
	folderId: FolderID;
}

export interface ArFSUploadFileResult {
	fileTrx: Transaction;
	fileId: FileID;
}

export interface ArFSCreatePrivateDriveResult extends ArFSCreateDriveResult {
	driveKey: DriveKey;
}

export class ArFSDAO {
	// TODO: Can we abstract Arweave type(s)?
	constructor(private readonly wallet: Wallet, private readonly arweave: Arweave) {}

	async createPublicFolder(
		folderName: string,
		driveId: DriveID,
		parentFolderId?: FolderID
	): Promise<ArFSCreateFolderResult> {
		// TODO: If no parent folder ID make sure no root folder ID already exists

		// Generate a new folder ID
		const folderId = uuidv4();

		if (parentFolderId) {
			// Assert that drive ID is consistent with parent folder ID
			const actualDriveId = await this.getDriveIdForFolderId(parentFolderId);

			if (actualDriveId !== driveId) {
				throw new Error(
					`Drive id: ${driveId} does not match actual drive id: ${actualDriveId} for parent folder id`
				);
			}
		} else {
			// If drive contains a root folder ID, treat this as a subfolder to the root folder
			const drive = await this.getPublicDriveEntity(driveId);

			if (drive.rootFolderId) {
				parentFolderId = drive.rootFolderId;
			}
		}

		// Get the current time so the app can display the "created" data later on
		const unixTime = Math.round(Date.now() / 1000);

		// Create a root folder metadata transaction
		const folderMetadata = new ArFSPublicFolderMetaDataPrototype(
			new ArFSPublicFolderData(folderName),
			unixTime,
			driveId,
			folderId,
			parentFolderId
		);
		const folderTrx = await this.prepareArFSObjectTransaction(folderMetadata);

		// Create the Folder Uploader objects
		const folderUploader = await this.arweave.transactions.getUploader(folderTrx);

		// Execute the uploads
		while (!folderUploader.isComplete) {
			await folderUploader.uploadChunk();
		}

		return { folderTrx, folderId };
	}

	// TODO: RETURN ALL TRANSACTION DATA
	async createPublicDrive(driveName: string): Promise<ArFSCreateDriveResult> {
		// Generate a new drive ID  for the new drive
		const driveId = uuidv4();

		// Create root folder
		const { folderTrx: rootFolderTrx, folderId: rootFolderId } = await this.createPublicFolder(driveName, driveId);

		// Get the current time so the app can display the "created" data later on
		const unixTime = Math.round(Date.now() / 1000);

		// Create a drive metadata transaction
		const driveMetaData = new ArFSPublicDriveMetaDataPrototype(
			new ArFSPublicDriveData(driveName, rootFolderId),
			unixTime,
			driveId
		);
		const driveTrx = await this.prepareArFSObjectTransaction(driveMetaData);

		// Create the Drive and Folder Uploader objects
		const driveUploader = await this.arweave.transactions.getUploader(driveTrx);

		// Execute the uploads
		while (!driveUploader.isComplete) {
			await driveUploader.uploadChunk();
		}

		return { driveTrx, rootFolderTrx, driveId, rootFolderId };
	}

	async createPrivateDrive(driveName: string, password: string): Promise<ArFSCreatePrivateDriveResult> {
		// Generate a new drive ID  for the new drive
		const driveId = uuidv4();

		// Generate a folder ID for the new drive's root folder
		const rootFolderId = uuidv4();

		// Get the current time so the app can display the "created" data later on
		const unixTime = Math.round(Date.now() / 1000);

		const wallet = this.wallet as JWKWallet;

		const privateDriveData = await ArFSPrivateDriveData.createArFSPrivateDriveData(
			driveName,
			rootFolderId,
			driveId,
			password,
			wallet.getPrivateKey()
		);

		// Create a drive metadata transaction
		const driveMetaData = new ArFSPrivateDriveMetaDataPrototype(unixTime, driveId, privateDriveData);
		const driveTrx = await this.prepareArFSObjectTransaction(driveMetaData);

		// Create a root folder metadata transaction
		const rootFolderMetadata = new ArFSPrivateFolderMetaDataPrototype(
			unixTime,
			driveId,
			rootFolderId,
			await ArFSPrivateFolderData.createArFSPrivateFolderData(
				driveName,
				driveId,
				password,
				wallet.getPrivateKey()
			)
		);
		const rootFolderTrx = await this.prepareArFSObjectTransaction(rootFolderMetadata);

		// Create the Drive and Folder Uploader objects
		const driveUploader = await this.arweave.transactions.getUploader(driveTrx);
		const folderUploader = await this.arweave.transactions.getUploader(rootFolderTrx);

		// Execute the uploads
		while (!driveUploader.isComplete) {
			await driveUploader.uploadChunk();
		}
		while (!folderUploader.isComplete) {
			await folderUploader.uploadChunk();
		}

		const driveKey = privateDriveData.driveKey;

		return { driveTrx, rootFolderTrx, driveId, rootFolderId, driveKey };
	}

	async uploadPublicFile(
		parentFolderId: string,
		filePath: string,
		driveId: DriveID,
		destFileName?: string
	): Promise<ArFSUploadFileResult> {
		const fileData = fs.readFileSync(filePath);

		const fileId = uuidv4();

		const unixTime = Math.round(Date.now() / 1000);

		const fileMetadata = new ArFSPublicFileMetaDataPrototype(
			new ArFSPublicFileData(fileData),
			unixTime,
			driveId,
			fileId,
			parentFolderId
		);
		const fileTrx = await this.prepareArFSObjectTransaction(fileMetadata);

		// Create the Folder Uploader objects
		// const fileUploader = await this.arweave.transactions.getUploader(fileTrx);

		// // Execute the uploads
		// while (!fileUploader.isComplete) {
		// 	await fileUploader.uploadChunk();
		// }

		// TODO: Use destFileName?
		console.log(destFileName);

		return { fileTrx, fileId };
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

	async getDriveIdForFolderId(folderId: FolderID): Promise<DriveID> {
		const query = {
			query: `query {
				transactions(
					first: 1
					tags: [
						{ name: "Folder-Id", values: "${folderId}" }
					]
				) {
					edges {
						node {
							id
							tags {
								name
								value
							}
						}
					}
				}
    }`
		};
		const response = await this.arweave.api.post(graphQLURL, query);
		const { data } = response.data;
		const { transactions } = data;

		const edges: GQLEdgeInterface[] = transactions.edges;

		if (!edges.length) {
			throw new Error(`No folder found with Folder-Id: ${folderId}`);
		}

		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const driveIdTag = edges[0].node.tags.find((t) => t.name === 'Drive-Id');
		if (driveIdTag) {
			return driveIdTag.value;
		}

		throw new Error(`No Drive-Id tag found for meta data transaction of Folder-Id: ${folderId}`);
	}

	async getPublicDriveEntity(driveId: string): Promise<ArFSDriveEntity> {
		const drive: ArFSDriveEntity = {
			appName: '',
			appVersion: '',
			arFS: '',
			contentType: '',
			driveId,
			drivePrivacy: '',
			entityType: 'drive',
			name: '',
			rootFolderId: '',
			txId: '',
			unixTime: 0,
			syncStatus: 0
		};

		// GraphQL Query
		const query = {
			query: `query {
		  transactions(
			first: 1
			sort: HEIGHT_ASC
			tags: [
			  { name: "Drive-Id", values: "${driveId}" }
			  { name: "Entity-Type", values: "drive" }
			  { name: "Drive-Privacy", values: "public" }])
			]
		  ) {
			edges {
			  node {
				id
				tags {
				  name
				  value
				}
			  }
			}
		  }
		}`
		};
		const response = await this.arweave.api.post(graphQLURL, query);
		const { data } = response.data;
		const { transactions } = data;
		const { edges } = transactions;
		edges.forEach((edge: GQLEdgeInterface) => {
			// Iterate through each tag and pull out each drive ID as well the drives privacy status
			const { node } = edge;
			const { tags } = node;
			tags.forEach((tag: GQLTagInterface) => {
				const key = tag.name;
				const { value } = tag;
				switch (key) {
					case 'App-Name':
						drive.appName = value;
						break;
					case 'App-Version':
						drive.appVersion = value;
						break;
					case 'ArFS':
						drive.arFS = value;
						break;
					case 'Content-Type':
						drive.contentType = value;
						break;
					case 'Drive-Id':
						drive.driveId = value;
						break;
					case 'Drive-Privacy':
						drive.drivePrivacy = value;
						break;
					case 'Unix-Time':
						drive.unixTime = +value;
						break;
					default:
						break;
				}
			});

			// Get the drives transaction ID
			drive.txId = node.id;
		});
		return drive;
	}
}
