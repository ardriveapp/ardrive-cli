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
	DriveAuthMode,
	DrivePrivacy,
	EntityType,
	extToMime,
	GQLEdgeInterface,
	GQLTagInterface
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
	CURRENT_ARFS_VERSION,
	CipherIV,
	RewardSettings
} from './types';
import { CreateTransactionInterface } from 'arweave/node/common';
import { ArFSPrivateDriveBuilder, ArFSPublicDriveBuilder } from './utils/arfs_builders/arfs_drive_builders';
import { ArFSPrivateFileBuilder, ArFSPublicFileBuilder } from './utils/arfs_builders/arfs_file_builders';
import { ArFSPrivateFolderBuilder, ArFSPublicFolderBuilder } from './utils/arfs_builders/arfs_folder_builders';
import { latestRevisionFilter } from './utils/filter_methods';
import { FolderHierarchy } from './folderHierarchy';

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

export abstract class ArFSDAOType {
	protected abstract readonly arweave: Arweave;
	protected abstract readonly appName: string;
	protected abstract readonly appVersion: string;
}

export interface CreatePublicFolderSettings {
	folderData: ArFSPublicFolderTransactionData;
	driveId: DriveID;
	rewardSettings: RewardSettings;
	parentFolderId?: FolderID;
	syncParentFolderId?: boolean;
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

		const driveBuilder = new ArFSPublicDriveBuilder(driveId, this.arweave);
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

		const folderBuilder = new ArFSPublicFolderBuilder(folderId, this.arweave);
		return await folderBuilder.build();
	}

	async getPublicFilesWithParentFolderIds(
		folderIDs: FolderID[],
		latestRevisionsOnly = false
	): Promise<ArFSPublicFile[]> {
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
				const { node } = edge;
				cursor = edge.cursor;
				const fileBuilder = await ArFSPublicFileBuilder.fromArweaveNode(node, this.arweave);
				return fileBuilder.build(node);
			});
			allFiles.push(...(await Promise.all(files)));
		}
		return latestRevisionsOnly ? allFiles.filter(latestRevisionFilter) : allFiles;
	}

	async getAllFoldersOfPublicDrive(driveId: DriveID, latestRevisionsOnly = false): Promise<ArFSPublicFolder[]> {
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
				const { node } = edge;
				cursor = edge.cursor;
				const folderBuilder = ArFSPublicFolderBuilder.fromArweaveNode(node, this.arweave);
				return await folderBuilder.build(node);
			});
			allFolders.push(...(await Promise.all(folders)));
		}
		return latestRevisionsOnly ? allFolders.filter(latestRevisionFilter) : allFolders;
	}

	/**
	 * Lists the children of certain public folder
	 * @param {FolderID} folderId the folder ID to list children of
	 * @returns {ArFSPublicFileOrFolderWithPaths[]} an array representation of the children and parent folder
	 */
	async listPublicFolder(folderId: FolderID, maxDepth = 0): Promise<ArFSPublicFileOrFolderWithPaths[]> {
		const folder = await this.getPublicFolder(folderId);

		// Fetch all of the folder entities within the drive
		const driveIdOfFolder = folder.driveId;
		const allFolderEntitiesOfDrive = await this.getAllFoldersOfPublicDrive(driveIdOfFolder, true);

		// Feed entities to FolderHierarchy
		const hierarchy = FolderHierarchy.newFromEntities(allFolderEntitiesOfDrive);
		const searchFolderIDs = hierarchy.folderIdSubtreeFromFolderId(folderId, maxDepth - 1);
		const [, ...subFolderIDs]: FolderID[] = hierarchy.folderIdSubtreeFromFolderId(folderId, maxDepth);

		const childrenFolderEntities = allFolderEntitiesOfDrive.filter((folder) =>
			subFolderIDs.includes(folder.entityId)
		);

		// Fetch all file entities within all Folders of the drive
		const childrenFileEntities = await this.getPublicFilesWithParentFolderIds(searchFolderIDs, true);

		const children = [...childrenFolderEntities, ...childrenFileEntities];

		const entitiesWithPath = children.map((entity) => new ArFSPublicFileOrFolderWithPaths(entity, hierarchy));
		return entitiesWithPath;
	}
}

export class ArFSDAO extends ArFSDAOAnonymous {
	// TODO: Can we abstract Arweave type(s)?
	constructor(
		private readonly wallet: Wallet,
		arweave: Arweave,
		private readonly dryRun = false,
		protected appName = DEFAULT_APP_NAME,
		protected appVersion = DEFAULT_APP_VERSION
	) {
		super(arweave, appName, appVersion);
	}

	async createPublicFolder({
		folderData,
		driveId,
		rewardSettings,
		parentFolderId,
		syncParentFolderId = true
	}: CreatePublicFolderSettings): Promise<ArFSCreateFolderResult> {
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
			folderData,
			unixTime,
			driveId,
			folderId,
			parentFolderId
		);
		const folderTrx = await this.prepareArFSObjectTransaction(folderMetadata, rewardSettings);

		// Execute the upload
		if (!this.dryRun) {
			const folderUploader = await this.arweave.transactions.getUploader(folderTrx);
			while (!folderUploader.isComplete) {
				await folderUploader.uploadChunk();
			}
		}

		return { folderTrxId: folderTrx.id, folderTrxReward: folderTrx.reward, folderId };
	}

	async createPublicDrive(
		driveName: string,
		driveRewardSettings: RewardSettings,
		rootFolderRewardSettings: RewardSettings
	): Promise<ArFSCreateDriveResult> {
		// Generate a new drive ID  for the new drive
		const driveId = uuidv4();

		// Create root folder
		const folderData = new ArFSPublicFolderTransactionData(driveName);
		const {
			folderTrxId: rootFolderTrxId,
			folderTrxReward: rootFolderTrxReward,
			folderId: rootFolderId
		} = await this.createPublicFolder({
			folderData,
			driveId,
			rewardSettings: rootFolderRewardSettings,
			syncParentFolderId: false
		});

		// Get the current time so the app can display the "created" data later on
		const unixTime = Math.round(Date.now() / 1000);

		// Create a drive metadata transaction
		const driveMetaData = new ArFSPublicDriveMetaDataPrototype(
			new ArFSPublicDriveTransactionData(driveName, rootFolderId),
			unixTime,
			driveId
		);
		const driveTrx = await this.prepareArFSObjectTransaction(driveMetaData, driveRewardSettings);

		// Execute the upload
		if (!this.dryRun) {
			const driveUploader = await this.arweave.transactions.getUploader(driveTrx);
			while (!driveUploader.isComplete) {
				await driveUploader.uploadChunk();
			}
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

	async createPrivateDrive(
		driveName: string,
		driveKey: DriveKey,
		driveId: DriveID,
		driveRewardSettings: RewardSettings,
		rootFolderRewardSettings: RewardSettings
	): Promise<ArFSCreatePrivateDriveResult> {
		// Generate a new drive ID  for the new drive

		// Generate a folder ID for the new drive's root folder
		const rootFolderId = uuidv4();

		// Get the current time so the app can display the "created" data later on
		const unixTime = Math.round(Date.now() / 1000);

		const privateDriveData = await ArFSPrivateDriveTransactionData.from(driveName, rootFolderId, driveKey);

		// Create a drive metadata transaction
		const driveMetaData = new ArFSPrivateDriveMetaDataPrototype(unixTime, driveId, privateDriveData);
		const driveTrx = await this.prepareArFSObjectTransaction(driveMetaData, driveRewardSettings);

		// Create a root folder metadata transaction
		const rootFolderMetadata = new ArFSPrivateFolderMetaDataPrototype(
			unixTime,
			driveId,
			rootFolderId,
			await ArFSPrivateFolderTransactionData.from(driveName, driveKey)
		);
		const rootFolderTrx = await this.prepareArFSObjectTransaction(rootFolderMetadata, rootFolderRewardSettings);

		// Execute the uploads
		if (!this.dryRun) {
			const driveUploader = await this.arweave.transactions.getUploader(driveTrx);
			const folderUploader = await this.arweave.transactions.getUploader(rootFolderTrx);
			while (!driveUploader.isComplete) {
				await driveUploader.uploadChunk();
			}
			while (!folderUploader.isComplete) {
				await folderUploader.uploadChunk();
			}
		}

		return {
			driveTrxId: driveTrx.id,
			driveTrxReward: driveTrx.reward,
			rootFolderTrxId: rootFolderTrx.id,
			rootFolderTrxReward: rootFolderTrx.reward,
			driveId: driveId,
			rootFolderId: rootFolderId,
			driveKey
		};
	}

	async uploadPublicFile(
		parentFolderId: FolderID,
		filePath: string,
		fileDataRewardSettings: RewardSettings,
		metadataRewardSettings: RewardSettings,
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
		const dataTrx = await this.prepareArFSObjectTransaction(fileDataPrototype, fileDataRewardSettings);

		// Upload file data
		if (!this.dryRun) {
			const dataUploader = await this.arweave.transactions.getUploader(dataTrx);
			while (!dataUploader.isComplete) {
				await dataUploader.uploadChunk();
			}
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
		const metaDataTrx = await this.prepareArFSObjectTransaction(fileMetadata, metadataRewardSettings);

		// Upload meta data
		if (!this.dryRun) {
			const metaDataUploader = await this.arweave.transactions.getUploader(metaDataTrx);
			while (!metaDataUploader.isComplete) {
				await metaDataUploader.uploadChunk();
			}
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
		filePath: string,
		driveKey: DriveKey,
		fileDataRewardSettings: RewardSettings,
		metadataRewardSettings: RewardSettings,
		destFileName?: string
	): Promise<ArFSUploadPrivateFileResult> {
		// Retrieve drive ID from folder ID and ensure that it is indeed a private drive
		const driveId = await this.getDriveIdForFolderId(parentFolderId);
		const drive = await this.getPrivateDrive(driveId, driveKey);
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
			await ArFSPrivateFileDataTransactionData.from(fileData, fileId, driveKey)
		);
		const dataTrx = await this.prepareArFSObjectTransaction(fileDataPrototype, fileDataRewardSettings);

		// Upload file data
		if (!this.dryRun) {
			const dataUploader = await this.arweave.transactions.getUploader(dataTrx);
			while (!dataUploader.isComplete) {
				await dataUploader.uploadChunk();
			}
		}

		// Prepare meta data transaction
		const fileMetaData = await ArFSPrivateFileMetadataTransactionData.from(
			destinationFileName,
			fileStats.size,
			lastModifiedDateMS,
			dataTrx.id,
			dataContentType,
			fileId,
			driveKey
		);
		const fileMetadataPrototype = new ArFSPrivateFileMetaDataPrototype(
			fileMetaData,
			unixTime,
			driveId,
			fileId,
			parentFolderId
		);

		const metaDataTrx = await this.prepareArFSObjectTransaction(fileMetadataPrototype, metadataRewardSettings);

		// Upload meta data
		if (!this.dryRun) {
			const metaDataUploader = await this.arweave.transactions.getUploader(metaDataTrx);
			while (!metaDataUploader.isComplete) {
				await metaDataUploader.uploadChunk();
			}
		}

		return {
			dataTrxId: dataTrx.id,
			dataTrxReward: dataTrx.reward,
			metaDataTrxId: metaDataTrx.id,
			metaDataTrxReward: metaDataTrx.reward,
			fileId,
			fileKey: fileMetaData.fileKey
		};
	}

	async prepareArFSObjectTransaction(
		objectMetaData: ArFSObjectMetadataPrototype,
		rewardSettings: RewardSettings = {},
		otherTags: GQLTagInterface[] = []
	): Promise<Transaction> {
		const wallet = this.wallet as JWKWallet;

		// Create transaction
		const trxAttributes: Partial<CreateTransactionInterface> = {
			data: objectMetaData.objectData.asTransactionData()
		};

		// If we provided our own reward setting, use it now
		if (rewardSettings.reward) {
			trxAttributes.reward = rewardSettings.reward;
		}
		const transaction = await this.arweave.createTransaction(trxAttributes, wallet.getPrivateKey());

		// If we've opted to boost the transaction, do so now
		if (rewardSettings.feeMultiple && rewardSettings.feeMultiple > 1.0) {
			// Round up with ceil because fractional Winston will cause an Arweave API failure
			transaction.reward = Math.ceil(+transaction.reward * rewardSettings.feeMultiple).toString();
		}

		// Add baseline ArFS Tags
		transaction.addTag('App-Name', this.appName);
		transaction.addTag('App-Version', this.appVersion);
		transaction.addTag('ArFS', CURRENT_ARFS_VERSION);
		if (rewardSettings.feeMultiple && rewardSettings.feeMultiple > 1.0) {
			transaction.addTag('Boost', rewardSettings.feeMultiple.toString());
		}

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

	async getPrivateDrive(driveId: DriveID, driveKey: DriveKey): Promise<ArFSPrivateDrive> {
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

		const drive = new ArFSPrivateDriveBuilder(driveId, this.arweave, driveKey);
		return await drive.build();
	}

	async getPrivateFolder(folderId: FolderID, driveKey: DriveKey): Promise<ArFSPrivateFolder> {
		const folderBuilder = new ArFSPrivateFolderBuilder(folderId, this.arweave, driveKey);
		return await folderBuilder.build();
	}

	async getAllFoldersOfPrivateDrive(
		driveId: DriveID,
		driveKey: DriveKey,
		latestRevisionsOnly = false
	): Promise<ArFSPrivateFolder[]> {
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

			const folders: Promise<ArFSPrivateFolder>[] = edges.map(async (edge: GQLEdgeInterface) => {
				cursor = edge.cursor;
				const { node } = edge;
				const folderBuilder = await ArFSPrivateFolderBuilder.fromArweaveNode(node, this.arweave, driveKey);
				return await folderBuilder.build(node);
			});
			allFolders.push(...(await Promise.all(folders)));
		}
		return latestRevisionsOnly ? allFolders.filter(latestRevisionFilter) : allFolders;
	}

	async getPrivateFilesWithParentFolderIds(
		folderIDs: FolderID[],
		driveKey: DriveKey,
		latestRevisionsOnly = false
	): Promise<ArFSPrivateFile[]> {
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
			const files: Promise<ArFSPrivateFile>[] = edges.map(async (edge: GQLEdgeInterface) => {
				const { node } = edge;
				cursor = edge.cursor;
				const fileBuilder = await ArFSPrivateFileBuilder.fromArweaveNode(node, this.arweave, driveKey);
				return await fileBuilder.build(node);
			});
			allFiles.push(...(await Promise.all(files)));
		}
		return latestRevisionsOnly ? allFiles.filter(latestRevisionFilter) : allFiles;
	}

	/**
	 * Lists the children of certain private folder
	 * @param {FolderID} folderId the folder ID to list children of
	 * @returns {ArFSPrivateFileOrFolderWithPaths[]} an array representation of the children and parent folder
	 */
	async listPrivateFolder(
		folderId: FolderID,
		driveKey: DriveKey,
		maxDepth = 0
	): Promise<ArFSPrivateFileOrFolderWithPaths[]> {
		const folder = await this.getPrivateFolder(folderId, driveKey);

		// Fetch all of the folder entities within the drive
		const driveIdOfFolder = folder.driveId;
		const allFolderEntitiesOfDrive = await this.getAllFoldersOfPrivateDrive(driveIdOfFolder, driveKey, true);

		const hierarchy = FolderHierarchy.newFromEntities(allFolderEntitiesOfDrive);
		const searchFolderIDs = hierarchy.folderIdSubtreeFromFolderId(folderId, maxDepth - 1);
		const [, ...subFolderIDs]: FolderID[] = hierarchy.folderIdSubtreeFromFolderId(folderId, maxDepth);

		const childrenFolderEntities = allFolderEntitiesOfDrive.filter((folder) =>
			subFolderIDs.includes(folder.entityId)
		);

		// Fetch all file entities within all Folders of the drive
		const childrenFileEntities = await this.getPrivateFilesWithParentFolderIds(searchFolderIDs, driveKey, true);

		const children = [...childrenFolderEntities, ...childrenFileEntities];

		const entitiesWithPath = children.map((entity) => new ArFSPrivateFileOrFolderWithPaths(entity, hierarchy));
		return entitiesWithPath;
	}
}

export class ArFSPublicDrive extends ArFSEntity implements ArFSDriveEntity {
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
		readonly drivePrivacy: DrivePrivacy,
		readonly rootFolderId: FolderID
	) {
		super(appName, appVersion, arFS, contentType, driveId, entityType, name, 0, txId, unixTime);
	}
}

export class ArFSPrivateDrive extends ArFSEntity implements ArFSDriveEntity {
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
		readonly drivePrivacy: DrivePrivacy,
		readonly rootFolderId: FolderID,
		readonly driveAuthMode: DriveAuthMode,
		readonly cipher: string,
		readonly cipherIV: CipherIV
	) {
		super(appName, appVersion, arFS, contentType, driveId, entityType, name, 0, txId, unixTime);
	}
}

export class ArFSFileOrFolderEntity extends ArFSEntity implements ArFSFileFolderEntity {
	lastModifiedDate!: never;
	folderId?: string;

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

export class ArFSPublicFileOrFolderWithPaths extends ArFSFileOrFolderEntity implements ArFSWithPath {
	readonly path: string;
	readonly txIdPath: string;
	readonly entityIdPath: string;

	constructor(entity: ArFSPublicFile | ArFSPublicFolder, hierarchy: FolderHierarchy) {
		super(
			entity.appName,
			entity.appVersion,
			entity.arFS,
			entity.contentType,
			entity.driveId,
			entity.entityType,
			entity.name,
			entity.txId,
			entity.unixTime,
			entity.parentFolderId,
			entity.entityId
		);
		this.path = `${hierarchy.pathToFolderId(entity.parentFolderId)}${entity.name}`;
		this.txIdPath = `${hierarchy.txPathToFolderId(entity.parentFolderId)}${entity.txId}`;
		this.entityIdPath = `${hierarchy.entityPathToFolderId(entity.parentFolderId)}${entity.entityId}`;
	}
}

export class ArFSPrivateFileOrFolderWithPaths extends ArFSFileOrFolderEntity implements ArFSWithPath {
	readonly cipher: string;
	readonly cipherIV: CipherIV;
	readonly path: string;
	readonly txIdPath: string;
	readonly entityIdPath: string;

	constructor(entity: ArFSPrivateFile | ArFSPrivateFolder, hierarchy: FolderHierarchy) {
		super(
			entity.appName,
			entity.appVersion,
			entity.arFS,
			entity.contentType,
			entity.driveId,
			entity.entityType,
			entity.name,
			entity.txId,
			entity.unixTime,
			entity.parentFolderId,
			entity.entityId
		);
		this.cipher = entity.cipher;
		this.cipherIV = entity.cipherIV;
		this.path = `${hierarchy.pathToFolderId(entity.parentFolderId)}${entity.name}`;
		this.txIdPath = `${hierarchy.txPathToFolderId(entity.parentFolderId)}${entity.txId}`;
		this.entityIdPath = `${hierarchy.entityPathToFolderId(entity.parentFolderId)}${entity.entityId}`;
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
		readonly fileId: FileID
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
			fileId
		);
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
		readonly fileId: FileID,
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
			fileId
		);
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
		readonly entityId: FolderID
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
