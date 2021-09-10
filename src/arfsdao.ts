import * as fs from 'fs';
import type { JWKWallet, Wallet } from './wallet_new';
import Arweave from 'arweave';
import { v4 as uuidv4 } from 'uuid';
import Transaction from 'arweave/node/lib/transaction';
import {
	ArFSDriveEntity,
	ArFSPrivateDriveEntity,
	extToMime,
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

export class ArFSDAO {
	// TODO: Can we abstract Arweave type(s)?
	constructor(private readonly wallet: Wallet, private readonly arweave: Arweave) {}

	async createPublicFolder(
		folderName: string,
		driveId: DriveID,
		parentFolderId?: FolderID
	): Promise<ArFSCreateFolderResult> {
		// Ensure that drive is indeed public
		const drive = await this.getPublicDriveEntity(driveId);
		if (!drive) {
			throw new Error(`Public drive with Drive ID ${driveId} not found!`);
		}

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
			if (!drive) {
				throw new Error(`Public drive with Drive ID ${driveId} not found!`);
			}

			if (drive.rootFolderId) {
				parentFolderId = drive.rootFolderId;
			}
		}

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
		const { folderTrx: rootFolderTrx, folderId: rootFolderId } = await this.createPublicFolder(driveName, driveId);

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
		const drive = await this.getPublicDriveEntity(driveId);
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
		const drive = await this.getPrivateDriveEntity(driveId);
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
			throw new Error(`Folder with Folder ID ${folderId} not found!`);
		}

		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const driveIdTag = edges[0].node.tags.find((t) => t.name === 'Drive-Id');
		if (driveIdTag) {
			return driveIdTag.value;
		}

		throw new Error(`No Drive-Id tag found for meta data transaction of Folder-Id: ${folderId}`);
	}

	async getPublicDriveEntity(driveId: string): Promise<ArFSDriveEntity> {
		// GraphQL Query
		const query = {
			query: `query {
						transactions(
							first: 1
							sort: HEIGHT_ASC
							tags: [
							{ name: "Drive-Id", values: "${driveId}" }
							{ name: "Entity-Type", values: "drive" }
							{ name: "Drive-Privacy", values: "public" }
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

		if (!edges.length) {
			throw new Error(`Public drive with Drive ID ${driveId} not found!`);
		}

		// TODO: CREATE A BUILDER AND REJECT INVALID ENTITIES
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

		const { node } = edges[0];
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

		const txData = await this.arweave.transactions.getData(drive.txId, { decode: true });
		const dataString = await Utf8ArrayToStr(txData);
		const dataJSON = await JSON.parse(dataString);

		// Get the drive name and root folder id
		drive.name = dataJSON.name;
		drive.rootFolderId = dataJSON.rootFolderId;

		return drive;
	}

	async getPrivateDriveEntity(driveId: string): Promise<ArFSPrivateDriveEntity> {
		// GraphQL Query
		const query = {
			query: `query {
						transactions(
							first: 1
							sort: HEIGHT_ASC
							tags: [
								{ name: "Drive-Id", values: "${driveId}" }
								{ name: "Entity-Type", values: "drive" }
								{ name: "Drive-Privacy", values: "private" }
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

		if (!edges.length) {
			throw new Error('');
		}

		// TODO: CREATE A BUILDER AND REJECT INVALID ENTITIES
		const drive: ArFSPrivateDriveEntity = {
			appName: '',
			appVersion: '',
			arFS: '',
			cipher: '',
			cipherIV: '',
			contentType: '',
			driveId,
			drivePrivacy: '',
			driveAuthMode: '',
			entityType: '',
			name: '',
			rootFolderId: '',
			txId: '',
			unixTime: 0,
			syncStatus: 0
		};

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
					case 'Cipher':
						drive.cipher = value;
						break;
					case 'Cipher-IV':
						drive.cipherIV = value;
						break;
					case 'Content-Type':
						drive.contentType = value;
						break;
					case 'Drive-Auth-Mode':
						drive.driveAuthMode = value;
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
