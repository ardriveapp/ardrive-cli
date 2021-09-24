/* eslint-disable no-console */
import type { JWKWallet, Wallet } from './wallet_new';
import Arweave from 'arweave';
import { v4 as uuidv4 } from 'uuid';
import Transaction from 'arweave/node/lib/transaction';
import {
	ArFSDriveEntity,
	ArFSEntity,
	ContentType,
	deriveDriveKey,
	deriveFileKey,
	driveDecrypt,
	DrivePrivacy,
	EntityType,
	GQLEdgeInterface,
	GQLTagInterface,
	Utf8ArrayToStr
} from 'ardrive-core-js';
import {
	ArFSPublicFileDataPrototype,
	ArFSObjectMetadataPrototype,
	ArFSPrivateDriveMetaDataPrototype,
	ArFSPrivateFolderMetaDataPrototype,
	ArFSPublicDriveMetaDataPrototype,
	ArFSPublicFileMetaDataPrototype,
	ArFSPublicFolderMetaDataPrototype,
	ArFSPrivateFileDataPrototype,
	ArFSPrivateFileMetaDataPrototype
} from './arfs_prototypes';
import {
	ArFSPrivateDriveTransactionData,
	ArFSPrivateFileDataTransactionData,
	ArFSPrivateFileMetadataTransactionData,
	ArFSPrivateFolderTransactionData,
	ArFSPublicDriveTransactionData,
	ArFSPublicFileDataTransactionData,
	ArFSPublicFileMetadataTransactionData,
	ArFSPublicFolderTransactionData
} from './arfs_trx_data_types';
import { buildQuery } from './query';
import { FsFile } from './fsFile';

export const ArFS_O_11 = '0.11';
import {
	DriveID,
	FolderID,
	FileID,
	DriveKey,
	TransactionID,
	Winston,
	FileKey,
	DEFAULT_APP_NAME,
	DEFAULT_APP_VERSION,
	CURRENT_ARFS_VERSION
} from './types';
import { CreateTransactionInterface } from 'arweave/node/common';

export const graphQLURL = 'https://arweave.net/graphql';
export interface ArFSCreateDriveResult {
	driveTrxId: TransactionID;
	driveTrxReward: Winston;
	rootFolderTrxId: TransactionID;
	rootFolderTrxReward: Winston;
	driveId: DriveID;
	rootFolderId: FolderID;
}

export interface ArFSCreateFolderResult {
	folderTrxId: TransactionID;
	folderTrxReward: Winston;
	folderId: FolderID;
}

export interface ArFSUploadFileResult {
	dataTrxId: TransactionID;
	dataTrxReward: Winston;
	metaDataTrxId: TransactionID;
	metaDataTrxReward: TransactionID;
	fileId: FileID;
}

export interface ArFSUploadPrivateFileResult extends ArFSUploadFileResult {
	fileKey: FileKey;
}

export interface ArFSCreatePrivateDriveResult extends ArFSCreateDriveResult {
	driveKey: DriveKey;
}
export interface ArFSCreatePrivateFolderResult extends ArFSCreateFolderResult {
	driveKey: DriveKey;
}

export abstract class ArFSDAOType {
	protected abstract readonly arweave: Arweave;
	protected abstract readonly appName: string;
	protected abstract readonly appVersion: string;
}

/**
 * Performs all ArFS spec operations that do NOT require a wallet for signing or decryption
 */
export class ArFSDAOAnonymous extends ArFSDAOType {
	constructor(
		protected readonly arweave: Arweave,
		protected appName = DEFAULT_APP_NAME,
		protected appVersion = DEFAULT_APP_VERSION
	) {
		super();
	}

	async getDriveIdForFolderId(folderId: FolderID): Promise<DriveID> {
		const gqlQuery = buildQuery([{ name: 'Folder-Id', value: folderId }]);

		const response = await this.arweave.api.post(graphQLURL, gqlQuery);
		const { data } = response.data;
		const { transactions } = data;

		const edges: GQLEdgeInterface[] = transactions.edges;

		if (!edges.length) {
			throw new Error(`Folder with Folder ID ${folderId} not found!`);
		}

		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const driveIdTag = edges[0].node.tags.find((t) => t.name === 'Drive-Id');
		if (driveIdTag) {
			return driveIdTag.value;
		}

		throw new Error(`No Drive-Id tag found for meta data transaction of Folder-Id: ${folderId}`);
	}

	async getPublicDrive(driveId: string): Promise<ArFSPublicDrive> {
		const gqlQuery = buildQuery([
			{ name: 'Drive-Id', value: driveId },
			{ name: 'Entity-Type', value: 'drive' },
			{ name: 'Drive-Privacy', value: 'public' }
		]);

		const response = await this.arweave.api.post(graphQLURL, gqlQuery);

		const { data } = response.data;
		const { transactions } = data;
		const { edges } = transactions;

		if (!edges.length) {
			throw new Error(`Public drive with Drive ID ${driveId} not found!`);
		}

		const driveBuilder = new ArFSPublicDriveBuilder();

		const { node } = edges[0];
		const { tags } = node;
		tags.forEach((tag: GQLTagInterface) => {
			const key = tag.name;
			const { value } = tag;
			switch (key) {
				case 'App-Name':
					driveBuilder.appName = value;
					break;
				case 'App-Version':
					driveBuilder.appVersion = value;
					break;
				case 'ArFS':
					driveBuilder.arFS = value;
					break;
				case 'Content-Type':
					driveBuilder.contentType = value as ContentType;
					break;
				case 'Drive-Id':
					driveBuilder.driveId = value;
					break;
				case 'Drive-Privacy':
					driveBuilder.drivePrivacy = value as DrivePrivacy;
					break;
				case 'Entity-Type':
					driveBuilder.entityType = value as EntityType;
					break;
				case 'Unix-Time':
					driveBuilder.unixTime = +value;
					break;
				default:
					break;
			}
		});

		// Get the drives transaction ID
		driveBuilder.txId = node.id;

		if (driveBuilder.txId) {
			const txData = await this.arweave.transactions.getData(driveBuilder.txId, { decode: true });
			const dataString = await Utf8ArrayToStr(txData);
			const dataJSON = await JSON.parse(dataString);

			// Get the drive name and root folder id
			driveBuilder.name = dataJSON.name;
			driveBuilder.rootFolderId = dataJSON.rootFolderId;
		}

		return driveBuilder.build();
	}
}

export class ArFSDAO extends ArFSDAOAnonymous {
	// TODO: Can we abstract Arweave type(s)?
	constructor(
		private readonly wallet: Wallet,
		arweave: Arweave,
		protected appName = DEFAULT_APP_NAME,
		protected appVersion = DEFAULT_APP_VERSION
	) {
		super(arweave, appName, appVersion);
	}

	async createPublicFolder(
		folderName: string,
		driveId: DriveID,
		parentFolderId?: FolderID,
		syncParentFolderId = true
	): Promise<ArFSCreateFolderResult> {
		if (parentFolderId && syncParentFolderId) {
			// Assert that drive ID is consistent with parent folder ID
			const actualDriveId = await this.getDriveIdForFolderId(parentFolderId);

			if (actualDriveId !== driveId) {
				throw new Error(
					`Drive id: ${driveId} does not match actual drive id: ${actualDriveId} for parent folder id`
				);
			}
		} else if (syncParentFolderId) {
			// If drive contains a root folder ID, treat this as a subfolder to the root folder
			const drive = await this.getPublicDrive(driveId);
			if (!drive) {
				throw new Error(`Public drive with Drive ID ${driveId} not found!`);
			}

			if (drive.rootFolderId) {
				parentFolderId = drive.rootFolderId;
			}
		}

		// Generate a new folder ID
		const folderId = uuidv4();

		// Get the current time so the app can display the "created" data later on
		const unixTime = Math.round(Date.now() / 1000);

		// Create a root folder metadata transaction
		const folderMetadata = new ArFSPublicFolderMetaDataPrototype(
			new ArFSPublicFolderTransactionData(folderName),
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

		return { folderTrxId: folderTrx.id, folderTrxReward: folderTrx.reward, folderId };
	}

	async createPrivateFolder(
		folderName: string,
		driveId: DriveID,
		drivePassword: string,
		parentFolderId?: FolderID,
		syncParentFolderId = true
	): Promise<ArFSCreatePrivateFolderResult> {
		if (parentFolderId && syncParentFolderId) {
			// Assert that drive ID is consistent with parent folder ID
			const actualDriveId = await this.getDriveIdForFolderId(parentFolderId);

			if (actualDriveId !== driveId) {
				throw new Error(
					`Drive id: ${driveId} does not match actual drive id: ${actualDriveId} for parent folder id`
				);
			}
		} else if (syncParentFolderId) {
			// If drive contains a root folder ID, treat this as a subfolder to the root folder
			const drive = await this.getPrivateDrive(driveId, drivePassword);
			if (!drive) {
				throw new Error(`Private drive with Drive ID ${driveId} not found!`);
			}

			if (drive.rootFolderId) {
				parentFolderId = drive.rootFolderId;
			}
		}

		const wallet = this.wallet as JWKWallet;

		// Generate a new folder ID
		const folderId = uuidv4();

		// Get the current time so the app can display the "created" data later on
		const unixTime = Math.round(Date.now() / 1000);

		// Create a folder metadata transaction
		const folderMetadata = new ArFSPrivateFolderMetaDataPrototype(
			unixTime,
			driveId,
			folderId,
			await ArFSPrivateFolderTransactionData.from(folderName, driveId, drivePassword, wallet.getPrivateKey()),
			parentFolderId
		);
		const folderTrx = await this.prepareArFSObjectTransaction(folderMetadata);

		// Create the Folder Uploader objects
		const folderUploader = await this.arweave.transactions.getUploader(folderTrx);

		// Execute the uploads
		while (!folderUploader.isComplete) {
			await folderUploader.uploadChunk();
		}

		const driveKey = folderMetadata.objectData.driveKey;

		return { folderTrxId: folderTrx.id, folderTrxReward: folderTrx.reward, folderId, driveKey };
	}

	async createPublicDrive(driveName: string): Promise<ArFSCreateDriveResult> {
		// Generate a new drive ID  for the new drive
		const driveId = uuidv4();

		// Create root folder
		const {
			folderTrxId: rootFolderTrxId,
			folderTrxReward: rootFolderTrxReward,
			folderId: rootFolderId
		} = await this.createPublicFolder(driveName, driveId, undefined, false);

		// Get the current time so the app can display the "created" data later on
		const unixTime = Math.round(Date.now() / 1000);

		// Create a drive metadata transaction
		const driveMetaData = new ArFSPublicDriveMetaDataPrototype(
			new ArFSPublicDriveTransactionData(driveName, rootFolderId),
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

		return {
			driveTrxId: driveTrx.id,
			driveTrxReward: driveTrx.reward,
			rootFolderTrxId: rootFolderTrxId,
			rootFolderTrxReward: rootFolderTrxReward,
			driveId: driveId,
			rootFolderId: rootFolderId
		};
	}

	async createPrivateDrive(driveName: string, password: string): Promise<ArFSCreatePrivateDriveResult> {
		// Generate a new drive ID  for the new drive
		const driveId = uuidv4();

		// Get the current time so the app can display the "created" data later on
		const unixTime = Math.round(Date.now() / 1000);

		const wallet = this.wallet as JWKWallet;

		// Create root folder
		const {
			folderTrxId: rootFolderTrxId,
			folderTrxReward: rootFolderTrxReward,
			folderId: rootFolderId
		} = await this.createPrivateFolder(driveName, driveId, password, undefined, false);

		// Create a drive metadata transaction
		const driveMetaData = new ArFSPrivateDriveMetaDataPrototype(
			unixTime,
			driveId,
			await ArFSPrivateDriveTransactionData.from(
				driveName,
				rootFolderId,
				driveId,
				password,
				wallet.getPrivateKey()
			)
		);
		const driveTrx = await this.prepareArFSObjectTransaction(driveMetaData);

		// Create the Drive Uploader object
		const driveUploader = await this.arweave.transactions.getUploader(driveTrx);

		// Execute the upload
		while (!driveUploader.isComplete) {
			await driveUploader.uploadChunk();
		}

		const driveKey = driveMetaData.objectData.driveKey;

		return {
			driveTrxId: driveTrx.id,
			driveTrxReward: driveTrx.reward,
			rootFolderTrxId,
			rootFolderTrxReward,
			driveId,
			rootFolderId,
			driveKey
		};
	}

	async uploadPublicFile(
		parentFolderId: FolderID,
		wrappedFile: FsFile,
		driveId: DriveID,
		reward: Winston,
		destFileName?: string
	): Promise<ArFSUploadFileResult> {
		// Establish destination file name
		const destinationFileName = destFileName ?? wrappedFile.getBaseFileName();

		// Generate file ID
		const fileId = uuidv4();

		// Get current time
		const unixTime = Math.round(Date.now() / 1000);

		// Gather file information
		const fileStats = wrappedFile.fileStats;
		const fileData = wrappedFile.getFileDataBuffer();
		const dataContentType = wrappedFile.getContentType();
		const lastModifiedDateMS = Math.floor(wrappedFile.fileStats.mtimeMs);

		// Build file data transaction
		const fileDataPrototype = new ArFSPublicFileDataPrototype(
			new ArFSPublicFileDataTransactionData(fileData),
			dataContentType
		);
		const dataTrx = await this.prepareArFSObjectTransaction(fileDataPrototype, reward);

		// Upload file data
		const dataUploader = await this.arweave.transactions.getUploader(dataTrx);
		while (!dataUploader.isComplete) {
			await dataUploader.uploadChunk();
		}

		// Prepare meta data transaction
		const fileMetadata = new ArFSPublicFileMetaDataPrototype(
			new ArFSPublicFileMetadataTransactionData(
				destinationFileName,
				fileStats.size,
				lastModifiedDateMS,
				dataTrx.id,
				dataContentType
			),
			unixTime,
			driveId,
			fileId,
			parentFolderId
		);
		const metaDataTrx = await this.prepareArFSObjectTransaction(fileMetadata);

		// Upload meta data
		const metaDataUploader = await this.arweave.transactions.getUploader(metaDataTrx);
		while (!metaDataUploader.isComplete) {
			await metaDataUploader.uploadChunk();
		}

		return {
			dataTrxId: dataTrx.id,
			dataTrxReward: dataTrx.reward,
			metaDataTrxId: metaDataTrx.id,
			metaDataTrxReward: metaDataTrx.reward,
			fileId
		};
	}

	async uploadPrivateFile(
		parentFolderId: FolderID,
		wrappedFile: FsFile,
		password: string,
		driveId: DriveID,
		reward: Winston,
		destFileName?: string
	): Promise<ArFSUploadPrivateFileResult> {
		const wallet: JWKWallet = this.wallet as JWKWallet;

		// Establish destination file name
		const destinationFileName = destFileName ?? wrappedFile.getBaseFileName();

		// Generate file ID
		const fileId = uuidv4();

		// Get current time
		const unixTime = Math.round(Date.now() / 1000);

		// Gather file information
		const fileStats = wrappedFile.fileStats;
		const fileData = wrappedFile.getFileDataBuffer();
		const dataContentType = wrappedFile.getContentType();
		const lastModifiedDateMS = Math.floor(wrappedFile.fileStats.mtimeMs);

		// Build file data transaction
		const fileDataPrototype = new ArFSPrivateFileDataPrototype(
			await ArFSPrivateFileDataTransactionData.from(fileData, fileId, driveId, password, wallet.getPrivateKey())
		);
		const dataTrx = await this.prepareArFSObjectTransaction(fileDataPrototype, reward);

		// Upload file data
		const dataUploader = await this.arweave.transactions.getUploader(dataTrx);
		while (!dataUploader.isComplete) {
			await dataUploader.uploadChunk();
		}

		// Prepare meta data transaction
		const fileMetadata = new ArFSPrivateFileMetaDataPrototype(
			await ArFSPrivateFileMetadataTransactionData.from(
				destinationFileName,
				fileStats.size,
				lastModifiedDateMS,
				dataTrx.id,
				dataContentType,
				fileId,
				driveId,
				password,
				wallet.getPrivateKey()
			),
			unixTime,
			driveId,
			fileId,
			parentFolderId
		);
		const metaDataTrx = await this.prepareArFSObjectTransaction(fileMetadata);

		// Upload meta data
		const metaDataUploader = await this.arweave.transactions.getUploader(metaDataTrx);
		while (!metaDataUploader.isComplete) {
			await metaDataUploader.uploadChunk();
		}

		// TODO: Get fileKey from ArFSPrivateFileMetadataTransactionData somehow
		return {
			dataTrxId: dataTrx.id,
			dataTrxReward: dataTrx.reward,
			metaDataTrxId: metaDataTrx.id,
			metaDataTrxReward: metaDataTrx.reward,
			fileId,
			fileKey: await deriveFileKey(
				fileId,
				await deriveDriveKey(password, driveId, JSON.stringify(wallet.getPrivateKey()))
			)
		};
	}

	async prepareArFSObjectTransaction(
		objectMetaData: ArFSObjectMetadataPrototype,
		reward?: Winston,
		otherTags: GQLTagInterface[] = []
	): Promise<Transaction> {
		const wallet = this.wallet as JWKWallet;

		// Create transaction
		const trxAttributes: Partial<CreateTransactionInterface> = {
			data: objectMetaData.objectData.asTransactionData()
		};

		// If we provided our own reward setting, use it now
		if (reward) {
			trxAttributes.reward = reward;
		}
		const transaction = await this.arweave.createTransaction(trxAttributes, wallet.getPrivateKey());

		// Add baseline ArFS Tags
		transaction.addTag('App-Name', this.appName);
		transaction.addTag('App-Version', this.appVersion);
		transaction.addTag('ArFS', CURRENT_ARFS_VERSION);

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

	async getPrivateDrive(driveId: DriveID, drivePassword: string): Promise<ArFSPrivateDrive> {
		const gqlQuery = buildQuery([
			{ name: 'Drive-Id', value: driveId },
			{ name: 'Entity-Type', value: 'drive' },
			{ name: 'Drive-Privacy', value: 'private' }
		]);

		const response = await this.arweave.api.post(graphQLURL, gqlQuery);
		const { data } = response.data;
		const { transactions } = data;
		const edges: GQLEdgeInterface[] = transactions.edges;

		if (!edges.length) {
			throw new Error(`Private drive with Drive ID ${driveId} not found or is not private!`);
		}

		const drive = new ArFSPrivateDriveBuilder();

		for await (const edge of edges) {
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
					case 'Cipher':
						drive.cipher = value;
						break;
					case 'Cipher-IV':
						drive.cipherIV = value;
						break;
					case 'Content-Type':
						drive.contentType = value as ContentType;
						break;
					case 'Drive-Auth-Mode':
						drive.driveAuthMode = value;
						break;
					case 'Drive-Id':
						drive.driveId = value;
						break;
					case 'Drive-Privacy':
						drive.drivePrivacy = value as DrivePrivacy;
						break;
					case 'Entity-Type':
						drive.entityType = value as EntityType;
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

			const txData = await this.arweave.transactions.getData(drive.txId, { decode: true });

			const wallet = this.wallet as JWKWallet;

			const dataBuffer = Buffer.from(txData);
			const driveKey: Buffer = await deriveDriveKey(
				drivePassword,
				driveId,
				JSON.stringify(wallet.getPrivateKey())
			);

			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			const decryptedDriveBuffer: Buffer = await driveDecrypt(drive.cipherIV!, driveKey, dataBuffer);
			const decryptedDriveString: string = await Utf8ArrayToStr(decryptedDriveBuffer);
			const decryptedDriveJSON = await JSON.parse(decryptedDriveString);

			// Get the drive name and root folder id
			drive.name = decryptedDriveJSON.name;
			drive.rootFolderId = decryptedDriveJSON.rootFolderId;
		}
		return drive.build();
	}
}

export class ArFSPublicDrive extends ArFSEntity implements ArFSDriveEntity {
	constructor(
		readonly appName: string,
		readonly appVersion: string,
		readonly arFS: string,
		readonly contentType: string,
		readonly driveId: string,
		readonly entityType: string,
		readonly name: string,
		readonly txId: string,
		readonly unixTime: number,
		readonly drivePrivacy: string,
		readonly rootFolderId: string
	) {
		super(appName, appVersion, arFS, contentType, driveId, entityType, name, 0, txId, unixTime);
	}
}

export class ArFSPublicDriveBuilder {
	appName?: string;
	appVersion?: string;
	arFS?: string;
	contentType?: ContentType;
	driveId?: DriveID;
	entityType?: EntityType;
	name?: string;
	txId?: TransactionID;
	unixTime?: number;
	drivePrivacy?: DrivePrivacy;
	rootFolderId?: FolderID;

	build(): ArFSPublicDrive {
		if (
			this.appName?.length &&
			this.appVersion?.length &&
			this.arFS?.length &&
			this.contentType?.length &&
			this.driveId?.length &&
			this.entityType?.length &&
			this.name?.length &&
			this.txId?.length &&
			this.unixTime &&
			this.drivePrivacy?.length &&
			this.rootFolderId?.length
		) {
			return new ArFSPublicDrive(
				this.appName,
				this.appVersion,
				this.arFS,
				this.contentType,
				this.driveId,
				this.entityType,
				this.name,
				this.txId,
				this.unixTime,
				this.drivePrivacy,
				this.rootFolderId
			);
		}

		throw new Error('Invalid drive state');
	}
}

export class ArFSPrivateDrive extends ArFSEntity implements ArFSDriveEntity {
	constructor(
		readonly appName: string,
		readonly appVersion: string,
		readonly arFS: string,
		readonly contentType: string,
		readonly driveId: string,
		readonly entityType: string,
		readonly name: string,
		readonly txId: string,
		readonly unixTime: number,
		readonly drivePrivacy: string,
		readonly rootFolderId: string,
		readonly driveAuthMode: string,
		readonly cipher: string,
		readonly cipherIV: string
	) {
		super(appName, appVersion, arFS, contentType, driveId, entityType, name, 0, txId, unixTime);
	}
}
export class ArFSPrivateDriveBuilder {
	appName?: string;
	appVersion?: string;
	arFS?: string;
	contentType?: ContentType;
	driveId?: DriveID;
	entityType?: EntityType;
	name?: string;
	txId?: TransactionID;
	unixTime?: number;
	drivePrivacy?: DrivePrivacy;
	rootFolderId?: FolderID;
	driveAuthMode?: string;
	cipher?: string;
	cipherIV?: string;

	build(): ArFSPrivateDrive {
		if (
			this.appName?.length &&
			this.appVersion?.length &&
			this.arFS?.length &&
			this.contentType?.length &&
			this.driveId?.length &&
			this.entityType?.length &&
			this.name?.length &&
			this.txId?.length &&
			this.unixTime &&
			this.drivePrivacy?.length &&
			this.rootFolderId?.length &&
			this.driveAuthMode?.length &&
			this.cipher?.length &&
			this.cipherIV?.length
		) {
			return new ArFSPrivateDrive(
				this.appName,
				this.appVersion,
				this.arFS,
				this.contentType,
				this.driveId,
				this.entityType,
				this.name,
				this.txId,
				this.unixTime,
				this.drivePrivacy,
				this.rootFolderId,
				this.driveAuthMode,
				this.cipher,
				this.cipherIV
			);
		}

		throw new Error('Invalid drive state');
	}
}
