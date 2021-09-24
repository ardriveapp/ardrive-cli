/* eslint-disable no-console */
import * as fs from 'fs';
import type { JWKWallet, Wallet } from './wallet_new';
import Arweave from 'arweave';
import { v4 as uuidv4 } from 'uuid';
import Transaction from 'arweave/node/lib/transaction';
import {
	ArFSDriveEntity,
	ArFSEntity,
	ArFSFileFolderEntity,
	ContentType,
	DrivePrivacy,
	EntityType,
	extToMime,
	getTransactionData,
	GQLEdgeInterface,
	GQLTagInterface,
	Utf8ArrayToStr
} from 'ardrive-core-js';
import { basename } from 'path';
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

export const ArFS_O_11 = '0.11';

export type CipherIV = string;
export type FolderID = string;
export type FileID = string;
export type DriveID = string;
export type DriveKey = Buffer;
export type DataContentType = string;
export type TransactionID = string;

export const graphQLURL = 'https://arweave.net/graphql';
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
	dataTrx: Transaction;
	metaDataTrx: Transaction;
	fileId: FileID;
}

export interface ArFSCreatePrivateDriveResult extends ArFSCreateDriveResult {
	driveKey: DriveKey;
}

export abstract class ArFSDAOType {
	protected abstract readonly arweave: Arweave;
}

/**
 * Performs all ArFS spec operations that do NOT require a wallet for signing or decryption
 */
export class ArFSDAOAnonymous extends ArFSDAOType {
	constructor(protected readonly arweave: Arweave) {
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

	async getPublicFolder(folderId: string): Promise<ArFSPublicFolder> {
		const gqlQuery = buildQuery([{ name: 'Folder-Id', value: folderId }]);

		const response = await this.arweave.api.post(graphQLURL, gqlQuery);

		const { data } = response.data;
		const { transactions } = data;
		const { edges } = transactions;

		if (!edges.length) {
			throw new Error(`Public folder with Folder ID ${folderId} not found!`);
		}

		const folderBuilder = new ArFSPublicFolderBuilder();

		const { node } = edges[0];
		const { tags } = node;
		tags.forEach((tag: GQLTagInterface) => {
			const key = tag.name;
			const { value } = tag;
			switch (key) {
				case 'App-Name':
					folderBuilder.appName = value;
					break;
				case 'App-Version':
					folderBuilder.appVersion = value;
					break;
				case 'ArFS':
					folderBuilder.arFS = value;
					break;
				case 'Content-Type':
					folderBuilder.contentType = value as ContentType;
					break;
				case 'Drive-Id':
					folderBuilder.driveId = value;
					break;
				case 'Entity-Type':
					folderBuilder.entityType = value as EntityType;
					break;
				case 'Unix-Time':
					folderBuilder.unixTime = +value;
					break;
				case 'Parent-Folder-Id':
					folderBuilder.parentFolderId = value;
					break;
				case 'Folder-Id':
					folderBuilder.entityId = value;
					break;
				default:
					break;
			}
		});

		// Get the drives transaction ID
		folderBuilder.txId = node.id;

		if (folderBuilder.txId) {
			const txData = await this.arweave.transactions.getData(folderBuilder.txId, { decode: true });
			const dataString = await Utf8ArrayToStr(txData);
			const dataJSON = await JSON.parse(dataString);

			// Get the drive name and root folder id
			folderBuilder.name = dataJSON.name;
		}

		return folderBuilder.build();
	}

	async getChildrenOfFolderTxIds(folderId: FolderID): Promise<string[]> {
		const gqlQuery = buildQuery([{ name: 'Parent-Folder-Id', value: folderId }]);
		const response = await this.arweave.api.post(graphQLURL, gqlQuery);

		const { data } = response.data;
		const { transactions } = data;
		const { edges } = transactions;

		// if (!edges.length) {
		// 	throw new Error(`Public folder with Folder ID ${folderId} not found!`);
		// }

		return edges.map((edge: GQLEdgeInterface) => edge.node.id);
	}

	async getAllPublicChildrenFilesFromFolderIDs(folderIDs: FolderID[]): Promise<ArFSPublicFile[]> {
		let cursor = '';
		let hasNextPage = true;
		const allFiles: ArFSPublicFile[] = [];

		while (hasNextPage) {
			const gqlQuery = buildQuery(
				[
					{ name: 'Parent-Folder-Id', value: folderIDs },
					{ name: 'Entity-Type', value: 'file' }
				],
				cursor
			);

			const response = await this.arweave.api.post(graphQLURL, gqlQuery);
			const { data } = response.data;
			const { transactions } = data;
			const { edges } = transactions;
			hasNextPage = transactions.pageInfo.hasNextPage;
			const files: Promise<ArFSPublicFile>[] = edges.map(async (edge: GQLEdgeInterface) => {
				// Iterate through each tag and pull out each drive ID as well the drives privacy status
				const folderBuilder = new ArFSPublicFileBuilder();
				const { node } = edge;
				const { tags } = node;
				cursor = edge.cursor;
				tags.forEach((tag: GQLTagInterface) => {
					const key = tag.name;
					const { value } = tag;
					switch (key) {
						case 'App-Name':
							folderBuilder.appName = value;
							break;
						case 'App-Version':
							folderBuilder.appVersion = value;
							break;
						case 'ArFS':
							folderBuilder.arFS = value;
							break;
						case 'Content-Type':
							folderBuilder.contentType = value as ContentType;
							break;
						case 'Drive-Id':
							folderBuilder.driveId = value;
							break;
						case 'Entity-Type':
							folderBuilder.entityType = value as EntityType;
							break;
						case 'Unix-Time':
							folderBuilder.unixTime = +value;
							break;
						case 'Parent-Folder-Id':
							folderBuilder.parentFolderId = value;
							break;
						case 'File-Id':
							folderBuilder.entityId = value;
							break;
						default:
							break;
					}
				});

				// Get the drives transaction ID
				folderBuilder.txId = node.id;

				const txData = await this.arweave.transactions.getData(folderBuilder.txId, { decode: true });
				const dataString = await Utf8ArrayToStr(txData);
				const dataJSON = await JSON.parse(dataString);

				// Get the drive name and root folder id
				folderBuilder.name = dataJSON.name;
				return folderBuilder.build();
			});
			allFiles.push(...(await Promise.all(files)));
		}
		return allFiles;
	}

	async getAllFoldersOfPublicDrive(driveId: FolderID): Promise<ArFSPublicFolder[]> {
		let cursor = '';
		let hasNextPage = true;
		const allFolders: ArFSPublicFolder[] = [];

		while (hasNextPage) {
			const gqlQuery = buildQuery(
				[
					{ name: 'Drive-Id', value: driveId },
					{ name: 'Entity-Type', value: 'folder' }
				],
				cursor
			);

			const response = await this.arweave.api.post(graphQLURL, gqlQuery);
			const { data } = response.data;
			const { transactions } = data;
			const { edges } = transactions;
			hasNextPage = transactions.pageInfo.hasNextPage;
			const folders: Promise<ArFSPublicFolder>[] = edges.map(async (edge: GQLEdgeInterface) => {
				// Iterate through each tag and pull out each drive ID as well the drives privacy status
				const folderBuilder = new ArFSPublicFolderBuilder();
				const { node } = edge;
				const { tags } = node;
				cursor = edge.cursor;
				tags.forEach((tag: GQLTagInterface) => {
					const key = tag.name;
					const { value } = tag;
					switch (key) {
						case 'App-Name':
							folderBuilder.appName = value;
							break;
						case 'App-Version':
							folderBuilder.appVersion = value;
							break;
						case 'ArFS':
							folderBuilder.arFS = value;
							break;
						case 'Content-Type':
							folderBuilder.contentType = value as ContentType;
							break;
						case 'Drive-Id':
							folderBuilder.driveId = value;
							break;
						case 'Entity-Type':
							folderBuilder.entityType = value as EntityType;
							break;
						case 'Unix-Time':
							folderBuilder.unixTime = +value;
							break;
						case 'Parent-Folder-Id':
							folderBuilder.parentFolderId = value;
							break;
						case 'Folder-Id':
							folderBuilder.entityId = value;
							break;
						default:
							break;
					}
				});

				// Get the drives transaction ID
				folderBuilder.txId = node.id;

				const txData = await this.arweave.transactions.getData(folderBuilder.txId, { decode: true });
				const dataString = await Utf8ArrayToStr(txData);
				const dataJSON = await JSON.parse(dataString);

				// Get the drive name and root folder id
				folderBuilder.name = dataJSON.name;
				return folderBuilder.build();
			});
			allFolders.push(...(await Promise.all(folders)));
		}
		return allFolders;
	}

	async getDataOfPublicEntityFromTxId(txId: string): Promise<any> {
		const rawData = await getTransactionData(txId);
		const parsedData = JSON.parse(rawData.toString());
		return parsedData;
	}
}

export class ArFSDAO extends ArFSDAOAnonymous {
	// TODO: Can we abstract Arweave type(s)?
	constructor(private readonly wallet: Wallet, arweave: Arweave) {
		super(arweave);
	}

	async createPublicFolder(
		folderName: string,
		driveId: DriveID,
		parentFolderId?: FolderID,
		syncParentFolderId = true
	): Promise<ArFSCreateFolderResult> {
		if (parentFolderId) {
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

		return { folderTrx, folderId };
	}

	async createPublicDrive(driveName: string): Promise<ArFSCreateDriveResult> {
		// Generate a new drive ID  for the new drive
		const driveId = uuidv4();

		// Create root folder
		const { folderTrx: rootFolderTrx, folderId: rootFolderId } = await this.createPublicFolder(
			driveName,
			driveId,
			undefined,
			false
		);

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

		const privateDriveData = await ArFSPrivateDriveTransactionData.from(
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
			await ArFSPrivateFolderTransactionData.from(driveName, driveId, password, wallet.getPrivateKey())
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
		parentFolderId: FolderID,
		filePath: string,
		destFileName?: string
	): Promise<ArFSUploadFileResult> {
		// Retrieve drive ID from folder ID and ensure that it is indeed public
		const driveId = await this.getDriveIdForFolderId(parentFolderId);
		const drive = await this.getPublicDrive(driveId);
		if (!drive) {
			throw new Error(`Public drive with Drive ID ${driveId} not found!`);
		}

		// Establish destination file name
		const destinationFileName = destFileName ?? basename(filePath);

		// Generate file ID
		const fileId = uuidv4();

		// Get current time
		const unixTime = Math.round(Date.now() / 1000);

		// Gather file information
		const fileStats = fs.statSync(filePath);
		const fileData = fs.readFileSync(filePath);
		const dataContentType = extToMime(filePath);
		const lastModifiedDateMS = Math.floor(fileStats.mtimeMs);

		// Build file data transaction
		const fileDataPrototype = new ArFSPublicFileDataPrototype(
			new ArFSPublicFileDataTransactionData(fileData),
			dataContentType
		);
		const dataTrx = await this.prepareArFSObjectTransaction(fileDataPrototype);

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

		return { dataTrx, metaDataTrx, fileId };
	}

	async uploadPrivateFile(
		parentFolderId: FolderID,
		filePath: string,
		password: string,
		destFileName?: string
	): Promise<ArFSUploadFileResult> {
		const wallet: JWKWallet = this.wallet as JWKWallet;

		// Retrieve drive ID from folder ID and ensure that it is indeed a private drive
		const driveId = await this.getDriveIdForFolderId(parentFolderId);
		const drive = await this.getPrivateDrive(driveId);
		if (!drive) {
			throw new Error(`Private drive with Drive ID ${driveId} not found!`);
		}

		// Establish destination file name
		const destinationFileName = destFileName ?? basename(filePath);

		// Generate file ID
		const fileId = uuidv4();

		// Get current time
		const unixTime = Math.round(Date.now() / 1000);

		// Gather file information
		const fileStats = fs.statSync(filePath);
		const fileData = fs.readFileSync(filePath);
		const dataContentType = extToMime(filePath);
		const lastModifiedDateMS = Math.floor(fileStats.mtimeMs);

		// Build file data transaction
		const fileDataPrototype = new ArFSPrivateFileDataPrototype(
			await ArFSPrivateFileDataTransactionData.from(fileData, fileId, driveId, password, wallet.getPrivateKey())
		);
		const dataTrx = await this.prepareArFSObjectTransaction(fileDataPrototype);

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

		return { dataTrx, metaDataTrx, fileId };
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

	async getPrivateDrive(driveId: DriveID): Promise<ArFSPrivateDrive> {
		const gqlQuery = buildQuery([
			{ name: 'Drive-Id', value: driveId },
			{ name: 'Entity-Type', value: 'drive' },
			{ name: 'Drive-Privacy', value: 'private' }
		]);

		const response = await this.arweave.api.post(graphQLURL, gqlQuery);
		const { data } = response.data;
		const { transactions } = data;
		const { edges } = transactions;

		if (!edges.length) {
			throw new Error(`Private drive with Drive ID ${driveId} not found or is not private!`);
		}

		const drive = new ArFSPrivateDriveBuilder();

		edges.forEach(async (edge: GQLEdgeInterface) => {
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
			const dataString = await Utf8ArrayToStr(txData);
			const dataJSON = await JSON.parse(dataString);

			// Get the drive name and root folder id
			drive.name = dataJSON.name;
			drive.rootFolderId = dataJSON.rootFolderId;
		});
		return drive.build();
	}

	async getAllFoldersOfPublicDrive(driveId: DriveID): Promise<ArFSPublicFolder[]> {
		let cursor = '';
		let hasNextPage = true;
		const allFolders: ArFSPublicFolder[] = [];

		while (hasNextPage) {
			const gqlQuery = buildQuery(
				[
					{ name: 'Drive-Id', value: driveId },
					{ name: 'Entity-Type', value: 'folder' }
				],
				cursor
			);

			const response = await this.arweave.api.post(graphQLURL, gqlQuery);
			const { data } = response.data;
			const { transactions } = data;
			const { edges } = transactions;
			hasNextPage = transactions.pageInfo.hasNextPage;

			const folders: Promise<ArFSPublicFolder>[] = edges.map(async (edge: GQLEdgeInterface) => {
				// Iterate through each tag and pull out each drive ID as well the drives privacy status
				const folderBuilder = new ArFSPublicFolderBuilder();
				const { node } = edge;
				const { tags } = node;
				cursor = edge.cursor;
				tags.map((tag: GQLTagInterface) => {
					const key = tag.name;
					const { value } = tag;
					switch (key) {
						case 'App-Name':
							folderBuilder.appName = value;
							break;
						case 'App-Version':
							folderBuilder.appVersion = value;
							break;
						case 'ArFS':
							folderBuilder.arFS = value;
							break;
						case 'Content-Type':
							folderBuilder.contentType = value as ContentType;
							break;
						case 'Drive-Id':
							folderBuilder.driveId = value;
							break;
						case 'Entity-Type':
							folderBuilder.entityType = value as EntityType;
							break;
						case 'Unix-Time':
							folderBuilder.unixTime = +value;
							break;
						case 'Parent-Folder-Id':
							folderBuilder.parentFolderId = value;
							break;
						case 'Folder-Id':
							folderBuilder.entityId = value;
							break;
						default:
							break;
					}
				});

				// Get the drives transaction ID
				folderBuilder.txId = node.id;

				const txData = await this.arweave.transactions.getData(folderBuilder.txId, { decode: true });
				const dataString = await Utf8ArrayToStr(txData);
				const dataJSON = await JSON.parse(dataString);

				// Get the drive name and root folder id
				folderBuilder.name = dataJSON.name;
				return folderBuilder.build();
			});
			allFolders.push(...(await Promise.all(folders)));
		}
		return allFolders;
	}

	async getPrivateFolder(folderId: FolderID): Promise<ArFSPrivateFolder> {
		const gqlQuery = buildQuery([
			{ name: 'Folder-Id', value: folderId },
			{ name: 'Entity-Type', value: 'folder' },
			{ name: 'Drive-Privacy', value: 'private' }
		]);

		const response = await this.arweave.api.post(graphQLURL, gqlQuery);
		const { data } = response.data;
		const { transactions } = data;
		const { edges } = transactions;

		if (!edges.length) {
			throw new Error(`Private folder with ID ${folderId} not found or is not private!`);
		}

		const folderBuilder = new ArFSPrivateFolderBuilder();

		edges.forEach(async (edge: GQLEdgeInterface) => {
			// Iterate through each tag and pull out each drive ID as well the drives privacy status
			const { node } = edge;
			const { tags } = node;
			tags.forEach((tag: GQLTagInterface) => {
				const key = tag.name;
				const { value } = tag;
				switch (key) {
					case 'App-Name':
						folderBuilder.appName = value;
						break;
					case 'App-Version':
						folderBuilder.appVersion = value;
						break;
					case 'ArFS':
						folderBuilder.arFS = value;
						break;
					case 'Cipher':
						folderBuilder.cipher = value;
						break;
					case 'Cipher-IV':
						folderBuilder.cipherIV = value;
						break;
					case 'Content-Type':
						folderBuilder.contentType = value as ContentType;
						break;
					case 'Drive-Id':
						folderBuilder.driveId = value;
						break;
					case 'Entity-Type':
						folderBuilder.entityType = value as EntityType;
						break;
					case 'Unix-Time':
						folderBuilder.unixTime = +value;
						break;
					case 'Parent-Folder-Id':
						folderBuilder.parentFolderId = value;
						break;
					case 'Folder-Id':
						folderBuilder.folderId = value;
						break;
					default:
						break;
				}
			});

			// Get the drives transaction ID
			folderBuilder.txId = node.id;

			const txData = await this.arweave.transactions.getData(folderBuilder.txId, { decode: true });
			const dataString = await Utf8ArrayToStr(txData);
			const dataJSON = await JSON.parse(dataString);

			// Get the drive name and root folder id
			folderBuilder.name = dataJSON.name;
		});
		return folderBuilder.build();
	}

	async getAllFoldersOfPrivateDrive(driveId: FolderID): Promise<ArFSPrivateFolder[]> {
		let cursor = '';
		let hasNextPage = true;
		const allFolders: ArFSPrivateFolder[] = [];

		while (hasNextPage) {
			const gqlQuery = buildQuery(
				[
					{ name: 'Drive-Id', value: driveId },
					{ name: 'Entity-Type', value: 'folder' }
				],
				cursor
			);

			const response = await this.arweave.api.post(graphQLURL, gqlQuery);
			const { data } = response.data;
			const { transactions } = data;
			const { edges } = transactions;
			hasNextPage = transactions.pageInfo.hasNextPage;

			const folders = edges.map(async (edge: GQLEdgeInterface) => {
				// Iterate through each tag and pull out each drive ID as well the drives privacy status
				const folderBuilder = new ArFSPrivateFolderBuilder();
				const { node } = edge;
				const { tags } = node;
				cursor = edge.cursor;
				tags.forEach((tag: GQLTagInterface) => {
					const key = tag.name;
					const { value } = tag;
					switch (key) {
						case 'App-Name':
							folderBuilder.appName = value;
							break;
						case 'App-Version':
							folderBuilder.appVersion = value;
							break;
						case 'ArFS':
							folderBuilder.arFS = value;
							break;
						case 'Cipher':
							folderBuilder.cipher = value;
							break;
						case 'Cipher-IV':
							folderBuilder.cipherIV = value;
							break;
						case 'Content-Type':
							folderBuilder.contentType = value as ContentType;
							break;
						case 'Drive-Id':
							folderBuilder.driveId = value;
							break;
						case 'Entity-Type':
							folderBuilder.entityType = value as EntityType;
							break;
						case 'Unix-Time':
							folderBuilder.unixTime = +value;
							break;
						case 'Parent-Folder-Id':
							folderBuilder.parentFolderId = value;
							break;
						case 'Folder-Id':
							folderBuilder.folderId = value;
							break;
						default:
							break;
					}
				});

				// Get the drives transaction ID
				folderBuilder.txId = node.id;

				const txData = await this.arweave.transactions.getData(folderBuilder.txId, { decode: true });
				const dataString = await Utf8ArrayToStr(txData);
				const dataJSON = await JSON.parse(dataString);

				// Get the drive name and root folder id
				folderBuilder.name = dataJSON.name;
				return folderBuilder.build();
			});
			allFolders.push(...folders);
		}

		return allFolders;
	}

	async getAllPrivateChildrenFilesFromFolderIDs(folderIDs: FolderID[]): Promise<ArFSPrivateFolder[]> {
		let cursor = '';
		let hasNextPage = true;
		const allFiles: ArFSPrivateFile[] = [];

		while (hasNextPage) {
			const gqlQuery = buildQuery(
				[
					{ name: 'Parent-Folder-Id', value: folderIDs },
					{ name: 'Entity-Type', value: 'file' }
				],
				cursor
			);

			const response = await this.arweave.api.post(graphQLURL, gqlQuery);
			const { data } = response.data;
			const { transactions } = data;
			const { edges } = transactions;
			hasNextPage = transactions.pageInfo.hasNextPage;
			const files = edges.map(async (edge: GQLEdgeInterface) => {
				// Iterate through each tag and pull out each drive ID as well the drives privacy status
				const fileBuilder = new ArFSPrivateFileBuilder();
				const { node } = edge;
				const { tags } = node;
				cursor = edge.cursor;
				tags.map((tag: GQLTagInterface) => {
					const key = tag.name;
					const { value } = tag;
					switch (key) {
						case 'App-Name':
							fileBuilder.appName = value;
							break;
						case 'App-Version':
							fileBuilder.appVersion = value;
							break;
						case 'ArFS':
							fileBuilder.arFS = value;
							break;
						case 'Cipher':
							fileBuilder.cipher = value;
							break;
						case 'Cipher-IV':
							fileBuilder.cipherIV = value;
							break;
						case 'Content-Type':
							fileBuilder.contentType = value as ContentType;
							break;
						case 'Drive-Id':
							fileBuilder.driveId = value;
							break;
						case 'Entity-Type':
							fileBuilder.entityType = value as EntityType;
							break;
						case 'Unix-Time':
							fileBuilder.unixTime = +value;
							break;
						case 'Parent-Folder-Id':
							fileBuilder.parentFolderId = value;
							break;
						case 'Entity-Id':
							fileBuilder.entityId = value;
							break;
						default:
							break;
					}
				});

				// Get the drives transaction ID
				fileBuilder.txId = node.id;

				const txData = await this.arweave.transactions.getData(fileBuilder.txId, { decode: true });
				const dataString = await Utf8ArrayToStr(txData);
				const dataJSON = await JSON.parse(dataString);

				// Get the drive name and root folder id
				fileBuilder.name = dataJSON.name;
				return fileBuilder.build();
			});
			allFiles.push(...files);
		}
		return allFiles;
	}
}

// abstract class EntityBuilder<T extends ArFSEntity> {
// 	hydratateFromTags(tags: GQLTagInterface): void {}
// 	abstract build(): T;
// }

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

export class ArFSFileOrFolderEntity extends ArFSEntity implements ArFSFileFolderEntity {
	lastModifiedDate!: never;

	constructor(
		appName: string,
		appVersion: string,
		arFS: string,
		contentType: string,
		driveId: string,
		entityType: string,
		name: string,
		txId: string,
		unixTime: number,
		readonly parentFolderId: string,
		readonly entityId: string
	) {
		super(appName, appVersion, arFS, contentType, driveId, entityType, name, 0, txId, unixTime);
	}
}

export interface ArFSWithPath {
	readonly path: string;
	readonly txIdPath: string;
	readonly entityIdPath: string;
}

// TODO: replace all 'FileOrFolder' ocurrencies with 'Directory' (?)
export class ArFSPublicFileOrFolderData extends ArFSFileOrFolderEntity implements ArFSWithPath {
	constructor(
		appName: string,
		appVersion: string,
		arFS: string,
		contentType: string,
		driveId: string,
		entityType: string,
		name: string,
		txId: string,
		unixTime: number,
		parentFolderId: string,
		entityId: string,
		readonly path: string,
		readonly txIdPath: string,
		readonly entityIdPath: string
	) {
		super(
			appName,
			appVersion,
			arFS,
			contentType,
			driveId,
			entityType,
			name,
			txId,
			unixTime,
			parentFolderId,
			entityId
		);
	}
}

export class ArFSPrivateFileOrFolderData extends ArFSFileOrFolderEntity implements ArFSWithPath {
	constructor(
		appName: string,
		appVersion: string,
		arFS: string,
		contentType: ContentType,
		driveId: DriveID,
		entityType: EntityType,
		name: string,
		txId: TransactionID,
		unixTime: number,
		parentFolderId: FolderID,
		entityId: string,
		readonly cipher: string,
		readonly cipherIV: CipherIV,
		readonly path: string,
		readonly txIdPath: string,
		readonly entityIdPath: string
	) {
		super(
			appName,
			appVersion,
			arFS,
			contentType,
			driveId,
			entityType,
			name,
			txId,
			unixTime,
			parentFolderId,
			entityId
		);
	}
}

export class ArFSPublicFile extends ArFSFileOrFolderEntity {
	constructor(
		readonly appName: string,
		readonly appVersion: string,
		readonly arFS: string,
		readonly contentType: ContentType,
		readonly driveId: DriveID,
		readonly entityType: EntityType,
		readonly name: string,
		readonly txId: string,
		readonly unixTime: number,
		readonly parentFolderId: FolderID,
		readonly entityId: FileID
	) {
		super(
			appName,
			appVersion,
			arFS,
			contentType,
			driveId,
			entityType,
			name,
			txId,
			unixTime,
			parentFolderId,
			entityId
		);
	}
}

export class ArFSPublicFileBuilder {
	appName?: string;
	appVersion?: string;
	arFS?: string;
	contentType?: ContentType;
	driveId?: DriveID;
	entityType?: EntityType;
	name?: string;
	txId?: TransactionID;
	unixTime?: number;
	parentFolderId?: string;
	entityId?: string;

	build(): ArFSPublicFile {
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
			this.entityId?.length
		) {
			return new ArFSPublicFolder(
				this.appName,
				this.appVersion,
				this.arFS,
				this.contentType,
				this.driveId,
				this.entityType,
				this.name,
				this.txId,
				this.unixTime,
				this.parentFolderId || 'root folder',
				this.entityId
			);
		}
		throw new Error('Invalid folder state');
	}
}

export class ArFSPrivateFile extends ArFSFileOrFolderEntity {
	constructor(
		readonly appName: string,
		readonly appVersion: string,
		readonly arFS: string,
		readonly contentType: ContentType,
		readonly driveId: DriveID,
		readonly entityType: EntityType,
		readonly name: string,
		readonly txId: TransactionID,
		readonly unixTime: number,
		readonly parentFolderId: FolderID,
		readonly entityId: FileID,
		readonly cipher: string,
		readonly cipherIV: string
	) {
		super(
			appName,
			appVersion,
			arFS,
			contentType,
			driveId,
			entityType,
			name,
			txId,
			unixTime,
			parentFolderId,
			entityId
		);
	}
}

export class ArFSPrivateFileBuilder {
	appName?: string;
	appVersion?: string;
	arFS?: string;
	contentType?: ContentType;
	driveId?: DriveID;
	entityType?: EntityType;
	name?: string;
	txId?: TransactionID;
	unixTime?: number;
	parentFolderId?: string;
	entityId?: string;
	cipher?: string;
	cipherIV?: string;

	build(): ArFSPrivateFolder {
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
			this.entityId?.length &&
			this.cipher?.length &&
			this.cipherIV?.length
		) {
			return new ArFSPrivateFolder(
				this.appName,
				this.appVersion,
				this.arFS,
				this.contentType,
				this.driveId,
				this.entityType,
				this.name,
				this.txId,
				this.unixTime,
				this.parentFolderId || 'root folder',
				this.entityId,
				this.cipher,
				this.cipherIV
			);
		}
		throw new Error('Invalid folder state');
	}
}

export class ArFSPublicFolder extends ArFSFileOrFolderEntity {
	constructor(
		readonly appName: string,
		readonly appVersion: string,
		readonly arFS: string,
		readonly contentType: ContentType,
		readonly driveId: DriveID,
		readonly entityType: EntityType,
		readonly name: string,
		readonly txId: TransactionID,
		readonly unixTime: number,
		readonly parentFolderId: FolderID,
		readonly folderId: FolderID
	) {
		super(
			appName,
			appVersion,
			arFS,
			contentType,
			driveId,
			entityType,
			name,
			txId,
			unixTime,
			parentFolderId,
			folderId
		);
	}
}

export class ArFSPublicFolderBuilder {
	appName?: string;
	appVersion?: string;
	arFS?: string;
	contentType?: ContentType;
	driveId?: DriveID;
	entityType?: EntityType;
	name?: string;
	txId?: TransactionID;
	unixTime?: number;
	parentFolderId?: string;
	entityId?: string;

	build(): ArFSPublicFolder {
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
			this.entityId?.length
		) {
			return new ArFSPublicFolder(
				this.appName,
				this.appVersion,
				this.arFS,
				this.contentType,
				this.driveId,
				this.entityType,
				this.name,
				this.txId,
				this.unixTime,
				this.parentFolderId || 'root folder',
				this.entityId
			);
		}
		throw new Error('Invalid folder state');
	}
}

export class ArFSPrivateFolder extends ArFSFileOrFolderEntity {
	constructor(
		readonly appName: string,
		readonly appVersion: string,
		readonly arFS: string,
		readonly contentType: ContentType,
		readonly driveId: DriveID,
		readonly entityType: EntityType,
		readonly name: string,
		readonly txId: string,
		readonly unixTime: number,
		readonly parentFolderId: FolderID,
		readonly entityId: FolderID,
		readonly cipher: string,
		readonly cipherIV: string
	) {
		super(
			appName,
			appVersion,
			arFS,
			contentType,
			driveId,
			entityType,
			name,
			txId,
			unixTime,
			parentFolderId,
			entityId
		);
	}
}

export class ArFSPrivateFolderBuilder {
	appName?: string;
	appVersion?: string;
	arFS?: string;
	contentType?: ContentType;
	driveId?: DriveID;
	entityType?: EntityType;
	name?: string;
	txId?: TransactionID;
	unixTime?: number;
	parentFolderId?: string;
	folderId?: string;
	cipher?: string;
	cipherIV?: string;

	build(): ArFSPrivateFolder {
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
			this.folderId?.length &&
			this.cipher?.length &&
			this.cipherIV?.length
		) {
			return new ArFSPrivateFolder(
				this.appName,
				this.appVersion,
				this.arFS,
				this.contentType,
				this.driveId,
				this.entityType,
				this.name,
				this.txId,
				this.unixTime,
				this.parentFolderId || 'root folder',
				this.folderId,
				this.cipher,
				this.cipherIV
			);
		}
		throw new Error('Invalid folder state');
	}
}

export class FolderTreeNode {
	constructor(
		public readonly folderId: FolderID,
		public readonly parent?: FolderTreeNode,
		public children: FolderTreeNode[] = []
	) {}

	public static fromEntity(folderEntity: ArFSFileOrFolderEntity): FolderTreeNode {
		const node = new FolderTreeNode(folderEntity.entityId);
		return node;
	}
}

export class FolderHierarchy {
	private _rootNode?: FolderTreeNode;

	constructor(
		private readonly folderIdToEntityMap: { [k: string]: ArFSFileOrFolderEntity },
		private readonly folderIdToNodeMap: { [k: string]: FolderTreeNode }
	) {}

	static newFromEntities(entities: ArFSFileOrFolderEntity[]): FolderHierarchy {
		const folderIdToEntityMap = entities.reduce((accumulator, entity) => {
			return Object.assign(accumulator, { [entity.entityId]: entity });
		}, {});
		const folderIdToNodeMap: { [k: string]: FolderTreeNode } = {};

		for (const entity of entities) {
			this.setupNodesWithEntity(entity, folderIdToEntityMap, folderIdToNodeMap);
		}

		return new FolderHierarchy(folderIdToEntityMap, folderIdToNodeMap);
	}

	private static setupNodesWithEntity(
		entity: ArFSFileOrFolderEntity,
		folderIdToEntityMap: { [k: string]: ArFSFileOrFolderEntity },
		folderIdToNodeMap: { [k: string]: FolderTreeNode }
	): void {
		const folderIdKeyIsPresent = Object.keys(folderIdToNodeMap).includes(entity.entityId);
		const parentFolderIdKeyIsPresent = Object.keys(folderIdToNodeMap).includes(entity.parentFolderId);
		if (!folderIdKeyIsPresent) {
			if (!parentFolderIdKeyIsPresent) {
				const parentFolderEntity = folderIdToEntityMap[entity.parentFolderId];
				if (parentFolderEntity) {
					this.setupNodesWithEntity(parentFolderEntity, folderIdToEntityMap, folderIdToNodeMap);
					const parent = folderIdToNodeMap[entity.parentFolderId];
					const node = new FolderTreeNode(entity.entityId, parent);
					parent.children.push(node);
					folderIdToNodeMap[entity.entityId] = node;
				}
			}
			const parent = folderIdToNodeMap[entity.parentFolderId];
			if (parent) {
				const node = new FolderTreeNode(entity.entityId, parent);
				parent.children.push(node);
				folderIdToNodeMap[entity.entityId] = node;
			} else {
				// this one is supposed to be the new root
				const rootNode = new FolderTreeNode(entity.entityId);
				folderIdToNodeMap[entity.entityId] = rootNode;
			}
		}
	}

	public get rootNode(): FolderTreeNode {
		if (this._rootNode) {
			return this._rootNode;
		}

		const someFolderId = Object.keys(this.folderIdToEntityMap)[0];
		let tmpNode = this.folderIdToNodeMap[someFolderId];
		while (tmpNode.parent && this.folderIdToNodeMap[tmpNode.parent.folderId]) {
			tmpNode = tmpNode.parent;
			this._rootNode = tmpNode;
		}
		return tmpNode;
	}

	public subTreeOf(folderId: FolderID): FolderHierarchy {
		const newRootNode = this.folderIdToNodeMap[folderId];

		const subTreeNodes = this.nodeAndChildrenOf(newRootNode);

		const entitiesMapping = subTreeNodes.reduce((accumulator, node) => {
			return Object.assign(accumulator, { [node.folderId]: this.folderIdToEntityMap[node.folderId] });
		}, {});
		const nodesMapping = subTreeNodes.reduce((accumulator, node) => {
			return Object.assign(accumulator, { [node.folderId]: node });
		}, {});

		return new FolderHierarchy(entitiesMapping, nodesMapping);
	}

	public allFolderIDs(): FolderID[] {
		return Object.keys(this.folderIdToEntityMap);
	}

	public nodeAndChildrenOf(node: FolderTreeNode): FolderTreeNode[] {
		const subTreeEntities: FolderTreeNode[] = [node];
		subTreeEntities.push(...node.children);

		return subTreeEntities;
	}

	public pathToFolderId(folderId: FolderID): string {
		if (this.rootNode.parent) {
			throw new Error(`Can't compute paths from sub-tree`);
		}
		let folderNode = this.folderIdToNodeMap[folderId];
		const nodesInPathToFolder = [folderNode];
		while (folderNode.parent && folderNode.folderId !== this.rootNode.folderId) {
			folderNode = folderNode.parent;
			nodesInPathToFolder.push(folderNode);
		}
		const olderFirstNodesInPathToFolder = nodesInPathToFolder.reverse();
		const olderFirstNamesOfNodesInPath = olderFirstNodesInPathToFolder.map(
			(n) => this.folderIdToEntityMap[n.folderId].name
		);
		const stringPath = olderFirstNamesOfNodesInPath.join('/');
		return `/${stringPath}`;
	}

	public entityPathToFolderId(folderId: FolderID): string {
		if (this.rootNode.parent) {
			throw new Error(`Can't compute paths from sub-tree`);
		}
		let folderNode = this.folderIdToNodeMap[folderId];
		const nodesInPathToFolder = [folderNode];
		while (folderNode.parent && folderNode.folderId !== this.rootNode.folderId) {
			folderNode = folderNode.parent;
			nodesInPathToFolder.push(folderNode);
		}
		const olderFirstNodesInPathToFolder = nodesInPathToFolder.reverse();
		const olderFirstFolderIDsOfNodesInPath = olderFirstNodesInPathToFolder.map((n) => n.folderId);
		const stringPath = olderFirstFolderIDsOfNodesInPath.join('/');
		return `/${stringPath}`;
	}

	public txPathToFolderId(folderId: FolderID): string {
		if (this.rootNode.parent) {
			throw new Error(`Can't compute paths from sub-tree`);
		}
		let folderNode = this.folderIdToNodeMap[folderId];
		const nodesInPathToFolder = [folderNode];
		while (folderNode.parent && folderNode.folderId !== this.rootNode.folderId) {
			folderNode = folderNode.parent;
			nodesInPathToFolder.push(folderNode);
		}
		const olderFirstNodesInPathToFolder = nodesInPathToFolder.reverse();
		const olderFirstTxTDsOfNodesInPath = olderFirstNodesInPathToFolder.map(
			(n) => this.folderIdToEntityMap[n.folderId].txId
		);
		const stringPath = olderFirstTxTDsOfNodesInPath.join('/');
		return `/${stringPath}`;
	}
}
