/* eslint-disable no-console */
import type { JWKWallet, Wallet } from './wallet_new';
import Arweave from 'arweave';
import { v4 as uuidv4 } from 'uuid';
import Transaction from 'arweave/node/lib/transaction';
import {
	ArFSDriveEntity,
	ArFSEntity,
	ArFSFileFolderEntity,
	ContentType,
	deriveDriveKey,
	DriveAuthMode,
	DrivePrivacy,
	EntityType,
	GQLEdgeInterface,
	GQLTagInterface,
	JWKInterface,
	uploadDataChunk
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
	ArFSPrivateFileMetaDataPrototype,
	ArFSEntityMetaDataPrototype,
	ArFSFolderMetaDataPrototype,
	ArFSDriveMetaDataPrototype
} from './arfs_prototypes';
import {
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
import { buildQuery } from './query';
import { ArFSFileToUpload } from './arfs_file_wrapper';
import {
	DriveID,
	FolderID,
	FileID,
	DriveKey,
	TransactionID,
	DEFAULT_APP_NAME,
	DEFAULT_APP_VERSION,
	CURRENT_ARFS_VERSION,
	CipherIV,
	RewardSettings,
	DataContentType,
	EntityID,
	UnixTime,
	ByteCount
} from './types';
import { CreateTransactionInterface } from 'arweave/node/common';
import { ArFSPrivateDriveBuilder, ArFSPublicDriveBuilder } from './utils/arfs_builders/arfs_drive_builders';
import { ArFSPrivateFileBuilder, ArFSPublicFileBuilder } from './utils/arfs_builders/arfs_file_builders';
import { ArFSPrivateFolderBuilder, ArFSPublicFolderBuilder } from './utils/arfs_builders/arfs_folder_builders';
import { latestRevisionFilter } from './utils/filter_methods';
import { FolderHierarchy } from './folderHierarchy';
import {
	MetaDataFactoryFunction,
	movePrivateFileMetaDataFactory,
	movePrivateFolderMetaDataFactory,
	movePublicFileMetaDataFactory,
	movePublicFolderMetaDataFactory
} from './arfs_meta_data_factory';
import {
	ArFSCreateDriveResult,
	ArFSCreateFolderResult,
	ArFSCreatePrivateDriveResult,
	ArFSMoveEntityResult,
	ArFSMovePrivateFileResult,
	ArFSMovePrivateFolderResult,
	ArFSMovePublicFileResult,
	ArFSMovePublicFolderResult,
	ArFSUploadFileResult,
	ArFSUploadPrivateFileResult,
	ArFSCreateDriveResultFactory,
	ArFSMoveEntityResultFactory
} from './arfs_entity_result_factory';
import {
	ArFSMetadataEntityBuilder,
	ArFSMetadataEntityBuilderFactoryFunction,
	ArFSMetadataEntityBuilderParams,
	ArFSPrivateMetadataEntityBuilderParams
} from './utils/arfs_builders/arfs_builders';

export const graphQLURL = 'https://arweave.net/graphql';

export class PrivateDriveKeyData {
	private constructor(readonly driveId: DriveID, readonly driveKey: DriveKey) {}

	static async from(drivePassword: string, privateKey: JWKInterface): Promise<PrivateDriveKeyData> {
		const driveId = uuidv4();
		const driveKey = await deriveDriveKey(drivePassword, driveId, JSON.stringify(privateKey));
		return new PrivateDriveKeyData(driveId, driveKey);
	}
}

export interface ArFSMoveParams<O extends ArFSFileOrFolderEntity, T extends ArFSObjectTransactionData> {
	originalMetaData: O;
	transactionData: T;
	newParentFolderId: FolderID;
	metaDataBaseReward: RewardSettings;
}

export type ArFSMoveFileParams<
	O extends ArFSPublicFile | ArFSPrivateFile,
	T extends ArFSFileMetadataTransactionData
> = ArFSMoveParams<O, T>;

export type ArFSMovePublicFileParams = ArFSMoveParams<ArFSPublicFile, ArFSPublicFileMetadataTransactionData>;
export type ArFSMovePrivateFileParams = ArFSMoveParams<ArFSPrivateFile, ArFSPrivateFileMetadataTransactionData>;
export type ArFSMovePublicFolderParams = ArFSMoveParams<ArFSPublicFolder, ArFSPublicFolderTransactionData>;
export type ArFSMovePrivateFolderParams = ArFSMoveParams<ArFSPrivateFolder, ArFSPrivateFolderTransactionData>;

export type FolderMetaDataPrototypeFactory<T extends ArFSFolderMetaDataPrototype> = (
	folderId: FolderID,
	parentFolderId?: FolderID
) => T;
export type GetDriveFunction<T extends ArFSPublicDrive | ArFSPrivateDrive> = () => Promise<T>;
export type CreateFolderFunction = (driveId: DriveID) => Promise<ArFSCreateFolderResult>;
export type CreateDriveMetadataFunction = (
	driveID: DriveID,
	rootFolderId: FolderID
) => Promise<ArFSDriveMetaDataPrototype>;

export abstract class ArFSDAOType {
	protected abstract readonly arweave: Arweave;
	protected abstract readonly appName: string;
	protected abstract readonly appVersion: string;
}

export interface CreateFolderSettings<T extends ArFSFolderTransactionData> {
	folderData: T;
	driveId: DriveID;
	rewardSettings: RewardSettings;
	parentFolderId?: FolderID;
	syncParentFolderId?: boolean;
}

export type CreatePublicFolderSettings = CreateFolderSettings<ArFSPublicFolderTransactionData>;

export interface CreatePrivateFolderSettings extends CreateFolderSettings<ArFSPrivateFolderTransactionData> {
	driveKey: DriveKey;
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

	private async getDriveID(entityId: EntityID, gqlTypeTag: 'File-Id' | 'Folder-Id') {
		const gqlQuery = buildQuery([{ name: gqlTypeTag, value: entityId }]);

		const response = await this.arweave.api.post(graphQLURL, gqlQuery);
		const { data } = response.data;
		const { transactions } = data;

		const edges: GQLEdgeInterface[] = transactions.edges;

		if (!edges.length) {
			throw new Error(`Entity with ${gqlTypeTag} ${entityId} not found!`);
		}

		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const driveIdTag = edges[0].node.tags.find((t) => t.name === 'Drive-Id');
		if (driveIdTag) {
			return driveIdTag.value;
		}

		throw new Error(`No Drive-Id tag found for meta data transaction of ${gqlTypeTag}: ${entityId}`);
	}

	async getDriveIdForFileId(fileId: FileID): Promise<DriveID> {
		return this.getDriveID(fileId, 'File-Id');
	}

	async getDriveIdForFolderId(folderId: FolderID): Promise<DriveID> {
		return this.getDriveID(folderId, 'Folder-Id');
	}

	// Convenience function for known-public use cases
	async getPublicDrive(driveId: DriveID): Promise<ArFSPublicDrive> {
		return new ArFSPublicDriveBuilder({ entityId: driveId, arweave: this.arweave }).build();
	}

	// Convenience function for known-private use cases
	async getPublicFolder(folderId: FolderID): Promise<ArFSPublicFolder> {
		return new ArFSPublicFolderBuilder({ entityId: folderId, arweave: this.arweave }).build();
	}

	async getPublicFile(fileId: FileID): Promise<ArFSPublicFile> {
		return new ArFSPublicFileBuilder({ entityId: fileId, arweave: this.arweave }).build();
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
				const fileBuilder = ArFSPublicFileBuilder.fromArweaveNode(node, this.arweave);
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
	 * @param {number} maxDepth a non-negative integer value indicating the depth of the folder tree to list where 0 = this folder's contents only
	 * @param {boolean} includeRoot whether or not folderId's folder data should be included in the listing
	 * @returns {ArFSPublicFileOrFolderWithPaths[]} an array representation of the children and parent folder
	 */
	async listPublicFolder(
		folderId: FolderID,
		maxDepth: number,
		includeRoot: boolean
	): Promise<ArFSPublicFileOrFolderWithPaths[]> {
		if ((maxDepth !== Number.POSITIVE_INFINITY && !Number.isInteger(maxDepth)) || maxDepth < 0) {
			throw new Error('maxDepth should be a non-negative integer!');
		}

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

		if (includeRoot) {
			childrenFolderEntities.unshift(folder);
		}

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

	// For generic use with public and private drives. Generic types should all be harmonious.
	async createFolder<
		T extends ArFSFolderTransactionData,
		S extends CreateFolderSettings<T>,
		D extends ArFSPublicDrive | ArFSPrivateDrive,
		M extends ArFSFolderMetaDataPrototype
	>(
		{ driveId, rewardSettings, parentFolderId, syncParentFolderId = true }: S,
		getDriveFn: GetDriveFunction<D>,
		folderPrototypeFactory: FolderMetaDataPrototypeFactory<M>
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
			const drive = await getDriveFn();

			if (!drive) {
				throw new Error(`Drive with Drive ID ${driveId} not found!`);
			}

			if (drive.rootFolderId) {
				parentFolderId = drive.rootFolderId;
			}
		}

		// Generate a new folder ID
		const folderId = uuidv4();

		// Create a root folder metadata transaction
		const folderMetadata = folderPrototypeFactory(folderId, parentFolderId);
		const folderTrx = await this.prepareArFSObjectTransaction(folderMetadata, rewardSettings);

		// Execute the upload
		if (!this.dryRun) {
			const folderUploader = await this.arweave.transactions.getUploader(folderTrx);
			while (!folderUploader.isComplete) {
				await folderUploader.uploadChunk();
			}
		}

		return { metaDataTrxId: folderTrx.id, metaDataTrxReward: folderTrx.reward, folderId };
	}

	// Convenience wrapper for folder creation in a known-public use case
	async createPublicFolder({
		folderData,
		driveId,
		rewardSettings,
		parentFolderId,
		syncParentFolderId = true
	}: CreatePublicFolderSettings): Promise<ArFSCreateFolderResult> {
		return this.createFolder<
			ArFSPublicFolderTransactionData,
			CreatePublicFolderSettings,
			ArFSPublicDrive,
			ArFSPublicFolderMetaDataPrototype
		>(
			{ folderData, driveId, rewardSettings, parentFolderId, syncParentFolderId },
			() => this.getPublicDrive(driveId),
			(folderId, parentFolderId) =>
				new ArFSPublicFolderMetaDataPrototype(folderData, driveId, folderId, parentFolderId)
		);
	}

	// Convenience wrapper for folder creation in a known-private use case
	async createPrivateFolder({
		folderData,
		driveId,
		driveKey,
		parentFolderId,
		rewardSettings,
		syncParentFolderId = true
	}: CreatePrivateFolderSettings): Promise<ArFSCreateFolderResult> {
		return this.createFolder<
			ArFSPrivateFolderTransactionData,
			CreatePrivateFolderSettings,
			ArFSPrivateDrive,
			ArFSPrivateFolderMetaDataPrototype
		>(
			{ folderData, driveId, rewardSettings, parentFolderId, syncParentFolderId, driveKey },
			() => this.getPrivateDrive(driveId, driveKey),
			(folderId, parentFolderId) =>
				new ArFSPrivateFolderMetaDataPrototype(driveId, folderId, folderData, parentFolderId)
		);
	}

	async createDrive<R extends ArFSCreateDriveResult>(
		driveRewardSettings: RewardSettings,
		createFolderFn: CreateFolderFunction,
		createMetadataFn: CreateDriveMetadataFunction,
		resultFactory: ArFSCreateDriveResultFactory<R>
	): Promise<R> {
		// Generate a new drive ID  for the new drive
		const driveId = uuidv4();

		// Create root folder
		const {
			metaDataTrxId: rootFolderTrxId,
			metaDataTrxReward: rootFolderTrxReward,
			folderId: rootFolderId
		} = await createFolderFn(driveId);

		// Create a drive metadata transaction
		const driveMetaData = await createMetadataFn(driveId, rootFolderId);
		const driveTrx = await this.prepareArFSObjectTransaction(driveMetaData, driveRewardSettings);

		// Execute the upload
		if (!this.dryRun) {
			const driveUploader = await this.arweave.transactions.getUploader(driveTrx);
			while (!driveUploader.isComplete) {
				await driveUploader.uploadChunk();
			}
		}

		return resultFactory({
			metaDataTrxId: driveTrx.id,
			metaDataTrxReward: driveTrx.reward,
			rootFolderTrxId: rootFolderTrxId,
			rootFolderTrxReward: rootFolderTrxReward,
			driveId: driveId,
			rootFolderId: rootFolderId
		});
	}

	async createPublicDrive(
		driveName: string,
		driveRewardSettings: RewardSettings,
		rootFolderRewardSettings: RewardSettings
	): Promise<ArFSCreateDriveResult> {
		return this.createDrive<ArFSCreateDriveResult>(
			driveRewardSettings,
			async (driveId) => {
				const folderData = new ArFSPublicFolderTransactionData(driveName);
				return this.createPublicFolder({
					folderData,
					driveId,
					rewardSettings: rootFolderRewardSettings,
					syncParentFolderId: false
				});
			},
			(driveId, rootFolderId) => {
				return Promise.resolve(
					new ArFSPublicDriveMetaDataPrototype(
						new ArFSPublicDriveTransactionData(driveName, rootFolderId),
						driveId
					)
				);
			},
			(result) => result // No change
		);
	}

	async createPrivateDrive(
		driveName: string,
		newDriveData: PrivateDriveKeyData,
		driveRewardSettings: RewardSettings,
		rootFolderRewardSettings: RewardSettings
	): Promise<ArFSCreatePrivateDriveResult> {
		return this.createDrive(
			driveRewardSettings,
			async (driveId) => {
				const folderData = await ArFSPrivateFolderTransactionData.from(driveName, newDriveData.driveKey);
				return this.createPrivateFolder({
					folderData,
					driveId,
					rewardSettings: rootFolderRewardSettings,
					syncParentFolderId: false,
					driveKey: newDriveData.driveKey
				});
			},
			async (driveId, rootFolderId) => {
				return Promise.resolve(
					new ArFSPrivateDriveMetaDataPrototype(
						driveId,
						await ArFSPrivateDriveTransactionData.from(driveName, rootFolderId, newDriveData.driveKey)
					)
				);
			},
			(result) => {
				return { ...result, driveKey: newDriveData.driveKey }; // Add drive key for private return type
			}
		);
	}

	async moveEntity<
		T extends ArFSFileFolderEntity,
		U extends ArFSObjectTransactionData,
		V extends ArFSEntityMetaDataPrototype,
		R extends ArFSMoveEntityResult
	>(
		params: ArFSMoveParams<T, U>,
		metaDataFactory: MetaDataFactoryFunction<T, U, V>,
		resultFactory: ArFSMoveEntityResultFactory<R>
	): Promise<R> {
		const { metaDataBaseReward, transactionData, originalMetaData, newParentFolderId } = params;

		const fileMetadataPrototype = metaDataFactory(newParentFolderId, originalMetaData, transactionData);

		// Prepare meta data transaction
		const metaDataTrx = await this.prepareArFSObjectTransaction(fileMetadataPrototype, metaDataBaseReward);

		// Upload meta data
		if (!this.dryRun) {
			const metaDataUploader = await this.arweave.transactions.getUploader(metaDataTrx);
			while (!metaDataUploader.isComplete) {
				await metaDataUploader.uploadChunk();
			}
		}

		return resultFactory({ metaDataTrxId: metaDataTrx.id, metaDataTrxReward: metaDataTrx.reward });
	}

	async movePublicFile(params: ArFSMovePublicFileParams): Promise<ArFSMovePublicFileResult> {
		return this.moveEntity<
			ArFSPublicFile,
			ArFSPublicFileMetadataTransactionData,
			ArFSPublicFileMetaDataPrototype,
			ArFSMovePublicFileResult
		>(params, movePublicFileMetaDataFactory, (results) => {
			return { ...results, dataTrxId: params.originalMetaData.dataTxId };
		});
	}

	async movePrivateFile(params: ArFSMovePrivateFileParams): Promise<ArFSMovePrivateFileResult> {
		return this.moveEntity<
			ArFSPrivateFile,
			ArFSPrivateFileMetadataTransactionData,
			ArFSPrivateFileMetaDataPrototype,
			ArFSMovePrivateFileResult
		>(params, movePrivateFileMetaDataFactory, (results) => {
			return { ...results, dataTrxId: params.originalMetaData.dataTxId, fileKey: params.transactionData.fileKey };
		});
	}

	async movePublicFolder(params: ArFSMovePublicFolderParams): Promise<ArFSMovePublicFolderResult> {
		return this.moveEntity<
			ArFSPublicFolder,
			ArFSPublicFolderTransactionData,
			ArFSPublicFolderMetaDataPrototype,
			ArFSMovePublicFolderResult
		>(params, movePublicFolderMetaDataFactory, (results) => results);
	}

	async movePrivateFolder(params: ArFSMovePrivateFolderParams): Promise<ArFSMovePrivateFolderResult> {
		return this.moveEntity<
			ArFSPrivateFolder,
			ArFSPrivateFolderTransactionData,
			ArFSPrivateFolderMetaDataPrototype,
			ArFSMovePrivateFolderResult
		>(params, movePrivateFolderMetaDataFactory, (results) => {
			return { ...results, driveKey: params.transactionData.driveKey };
		});
	}

	async uploadPublicFile(
		parentFolderId: FolderID,
		wrappedFile: ArFSFileToUpload,
		driveId: DriveID,
		fileDataRewardSettings: RewardSettings,
		metadataRewardSettings: RewardSettings,
		destFileName?: string
	): Promise<ArFSUploadFileResult> {
		// Establish destination file name
		const destinationFileName = destFileName ?? wrappedFile.getBaseFileName();

		// Generate file ID
		const fileId = uuidv4();

		// Gather file information
		const { fileSize, dataContentType, lastModifiedDateMS } = wrappedFile.gatherFileInfo();

		// Read file data into memory
		const fileData = wrappedFile.getFileDataBuffer();

		// Build file data transaction
		const fileDataPrototype = new ArFSPublicFileDataPrototype(
			new ArFSPublicFileDataTransactionData(fileData),
			dataContentType
		);
		const dataTrx = await this.prepareArFSObjectTransaction(fileDataPrototype, fileDataRewardSettings);

		// Upload file data
		if (!this.dryRun) {
			console.log(`Uploading public file: "${wrappedFile.filePath}" to the permaweb..`);
			await this.sendChunkedUploadWithProgress(dataTrx);
		}

		// Prepare meta data transaction
		const fileMetadata = new ArFSPublicFileMetaDataPrototype(
			new ArFSPublicFileMetadataTransactionData(
				destinationFileName,
				fileSize,
				lastModifiedDateMS,
				dataTrx.id,
				dataContentType
			),
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
		wrappedFile: ArFSFileToUpload,
		driveId: DriveID,
		driveKey: DriveKey,
		fileDataRewardSettings: RewardSettings,
		metadataRewardSettings: RewardSettings,
		destFileName?: string
	): Promise<ArFSUploadPrivateFileResult> {
		// Establish destination file name
		const destinationFileName = destFileName ?? wrappedFile.getBaseFileName();

		// Generate file ID
		const fileId = uuidv4();

		// Gather file information
		const { fileSize, dataContentType, lastModifiedDateMS } = wrappedFile.gatherFileInfo();

		// Read file data into memory
		const fileData = wrappedFile.getFileDataBuffer();

		// Build file data transaction
		const fileDataPrototype = new ArFSPrivateFileDataPrototype(
			await ArFSPrivateFileDataTransactionData.from(fileData, fileId, driveKey)
		);
		const dataTrx = await this.prepareArFSObjectTransaction(fileDataPrototype, fileDataRewardSettings);

		// Upload file data
		if (!this.dryRun) {
			console.log(`Uploading private file: "${wrappedFile.filePath}" to the permaweb..`);
			await this.sendChunkedUploadWithProgress(dataTrx);
		}

		// Prepare meta data transaction
		const fileMetaData = await ArFSPrivateFileMetadataTransactionData.from(
			destinationFileName,
			fileSize,
			lastModifiedDateMS,
			dataTrx.id,
			dataContentType,
			fileId,
			driveKey
		);
		const fileMetadataPrototype = new ArFSPrivateFileMetaDataPrototype(
			fileMetaData,
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

	/**
	 * Uploads a v2 transaction in chunks with progress logging
	 *
	 * @example await this.sendChunkedUpload(myTransaction);
	 */
	async sendChunkedUploadWithProgress(trx: Transaction): Promise<void> {
		const dataUploader = await this.arweave.transactions.getUploader(trx);

		while (!dataUploader.isComplete) {
			const nextChunk = await uploadDataChunk(dataUploader);
			if (nextChunk === null) {
				break;
			} else {
				// TODO: Add custom logger function that produces various levels of detail
				console.log(
					`${dataUploader.pctComplete}% complete, ${dataUploader.uploadedChunks}/${dataUploader.totalChunks}`
				);
			}
		}
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

		// TODO: Use a mock arweave server instead
		if (process.env.NODE_ENV === 'test') {
			trxAttributes.last_tx = 'STUB';
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

	// Generic function for generic privacy use cases
	async getDrive<
		R extends ArFSPublicDrive | ArFSPrivateDrive,
		B extends ArFSMetadataEntityBuilder<R>,
		P extends ArFSMetadataEntityBuilderParams,
		F extends ArFSMetadataEntityBuilderFactoryFunction<R, B, P>
	>(builderFactory: F, builderFactoryParams: P): Promise<R> {
		const driveBuilder = builderFactory(builderFactoryParams);
		return await driveBuilder.build();
	}

	// Convenience function for known-private use cases
	async getPrivateDrive(driveId: DriveID, driveKey: DriveKey): Promise<ArFSPrivateDrive> {
		// Exemplifies use of the generic case although utilizing an ArFSPrivateDriveBuilder on its own would suffice
		const driveBuilderFn = ({ entityId, arweave, key }: ArFSPrivateMetadataEntityBuilderParams) => {
			return new ArFSPrivateDriveBuilder({ entityId, arweave, key });
		};
		return this.getDrive<
			ArFSPrivateDrive,
			ArFSPrivateDriveBuilder,
			ArFSPrivateMetadataEntityBuilderParams,
			ArFSMetadataEntityBuilderFactoryFunction<
				ArFSPrivateDrive,
				ArFSPrivateDriveBuilder,
				ArFSPrivateMetadataEntityBuilderParams
			>
		>(driveBuilderFn, { entityId: driveId, arweave: this.arweave, key: driveKey });
	}

	// Generic function for generic privacy use cases
	async getFolder<
		R extends ArFSPublicFolder | ArFSPrivateFolder,
		B extends ArFSMetadataEntityBuilder<R>,
		P extends ArFSMetadataEntityBuilderParams,
		F extends ArFSMetadataEntityBuilderFactoryFunction<R, B, P>
	>(builderFactory: F, builderFactoryParams: P): Promise<R> {
		const folderBuilder = builderFactory(builderFactoryParams);
		return await folderBuilder.build();
	}

	// Convenience function for known-private use cases
	async getPrivateFolder(folderId: FolderID, driveKey: DriveKey): Promise<ArFSPrivateFolder> {
		// Exemplifies use of the generic case although utilizing an ArFSPrivateFolderBuilder on its own would suffice
		const folderBuilderFn = ({ entityId, arweave, key }: ArFSPrivateMetadataEntityBuilderParams) =>
			new ArFSPrivateFolderBuilder(entityId, arweave, key);
		return this.getFolder<
			ArFSPrivateFolder,
			ArFSPrivateFolderBuilder,
			ArFSPrivateMetadataEntityBuilderParams,
			ArFSMetadataEntityBuilderFactoryFunction<
				ArFSPrivateFolder,
				ArFSPrivateFolderBuilder,
				ArFSPrivateMetadataEntityBuilderParams
			>
		>(folderBuilderFn, { entityId: folderId, arweave: this.arweave, key: driveKey });
	}

	async getPrivateFile(fileId: FileID, driveKey: DriveKey): Promise<ArFSPrivateFile> {
		return new ArFSPrivateFileBuilder(fileId, this.arweave, driveKey).build();
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
	 * @param {DriveKey} driveKey the drive key used for drive and folder data decryption and file key derivation
	 * @param {number} maxDepth a non-negative integer value indicating the depth of the folder tree to list where 0 = this folder's contents only
	 * @param {boolean} includeRoot whether or not folderId's folder data should be included in the listing
	 * @returns {ArFSPrivateFileOrFolderWithPaths[]} an array representation of the children and parent folder
	 */
	async listPrivateFolder(
		folderId: FolderID,
		driveKey: DriveKey,
		maxDepth: number,
		includeRoot: boolean
	): Promise<ArFSPrivateFileOrFolderWithPaths[]> {
		if ((maxDepth !== Number.POSITIVE_INFINITY && !Number.isInteger(maxDepth)) || maxDepth < 0) {
			throw new Error('maxDepth should be a non-negative integer!');
		}

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

		if (includeRoot) {
			childrenFolderEntities.unshift(folder);
		}

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
		readonly unixTime: UnixTime,
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
		readonly unixTime: UnixTime,
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
	folderId?: FolderID;

	constructor(
		appName: string,
		appVersion: string,
		arFS: string,
		contentType: ContentType,
		driveId: DriveID,
		entityType: EntityType,
		name: string,
		txId: TransactionID,
		unixTime: UnixTime,
		public lastModifiedDate: UnixTime,
		readonly parentFolderId: FolderID,
		readonly entityId: EntityID
	) {
		super(appName, appVersion, arFS, contentType, driveId, entityType, name, lastModifiedDate, txId, unixTime);
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
			entity.lastModifiedDate,
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
			entity.lastModifiedDate,
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
		readonly txId: TransactionID,
		readonly unixTime: UnixTime,
		readonly parentFolderId: FolderID,
		readonly fileId: FileID,
		readonly size: ByteCount,
		readonly lastModifiedDate: UnixTime,
		readonly dataTxId: TransactionID,
		readonly dataContentType: DataContentType
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
			lastModifiedDate,
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
		readonly unixTime: UnixTime,
		readonly parentFolderId: FolderID,
		readonly fileId: FileID,
		readonly size: ByteCount,
		readonly lastModifiedDate: UnixTime,
		readonly dataTxId: TransactionID,
		readonly dataContentType: DataContentType,
		readonly cipher: string,
		readonly cipherIV: CipherIV
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
			lastModifiedDate,
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
		readonly unixTime: UnixTime,
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
			0,
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
		readonly txId: TransactionID,
		readonly unixTime: UnixTime,
		readonly parentFolderId: FolderID,
		readonly entityId: FolderID,
		readonly cipher: string,
		readonly cipherIV: CipherIV
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
			0,
			parentFolderId,
			entityId
		);
	}
}
