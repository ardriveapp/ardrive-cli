/* eslint-disable no-console */
import type { JWKWallet, Wallet } from './wallet';
import Arweave from 'arweave';
import { v4 as uuidv4 } from 'uuid';
import Transaction from 'arweave/node/lib/transaction';
import { deriveDriveKey, GQLEdgeInterface, GQLNodeInterface, GQLTagInterface, JWKInterface } from 'ardrive-core-js';
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
	ArFSFileMetadataTransactionData,
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
import { ASCENDING_ORDER, buildQuery } from './query';
import { ArFSFileToUpload } from './arfs_file_wrapper';
import {
	DriveID,
	FolderID,
	FileID,
	DriveKey,
	DEFAULT_APP_NAME,
	DEFAULT_APP_VERSION,
	CURRENT_ARFS_VERSION,
	RewardSettings,
	ArweaveAddress,
	W,
	TxID,
	EID
} from './types';
import { CreateTransactionInterface } from 'arweave/node/common';
import { ArFSPrivateFileBuilder, ArFSPublicFileBuilder } from './utils/arfs_builders/arfs_file_builders';
import { ArFSPrivateFolderBuilder, ArFSPublicFolderBuilder } from './utils/arfs_builders/arfs_folder_builders';
import { latestRevisionFilter, fileFilter, folderFilter } from './utils/filter_methods';
import { ArFSPrivateDriveBuilder, SafeArFSDriveBuilder } from './utils/arfs_builders/arfs_drive_builders';
import { FolderHierarchy } from './folderHierarchy';
import {
	CreateDriveMetaDataFactory,
	FileDataPrototypeFactory,
	FileMetaDataFactory,
	FileMetadataTrxDataFactory,
	FolderMetaDataFactory,
	MoveEntityMetaDataFactory
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
	ArFSMoveEntityResultFactory,
	ArFSUploadFileResultFactory,
	WithDriveKey
} from './arfs_entity_result_factory';
import {
	ArFSFileOrFolderEntity,
	ArFSPrivateDrive,
	ArFSPrivateFile,
	ArFSPrivateFileOrFolderWithPaths,
	ArFSPrivateFolder,
	ArFSPublicDrive,
	ArFSPublicFile,
	ArFSPublicFolder,
	ENCRYPTED_DATA_PLACEHOLDER
} from './arfs_entities';
import { ArFSAllPublicFoldersOfDriveParams, ArFSDAOAnonymous } from './arfsdao_anonymous';
import { ArFSFileOrFolderBuilder } from './utils/arfs_builders/arfs_builders';
import { PrivateKeyData } from './private_key_data';
import {
	EntityNamesAndIds,
	entityToNameMap,
	fileConflictInfoMap,
	folderToNameAndIdMap
} from './utils/mapper_functions';
import { ListPrivateFolderParams } from './ardrive';

export const graphQLURL = 'https://arweave.net/graphql';

export class PrivateDriveKeyData {
	private constructor(readonly driveId: DriveID, readonly driveKey: DriveKey) {}

	static async from(drivePassword: string, privateKey: JWKInterface): Promise<PrivateDriveKeyData> {
		const driveId = uuidv4();
		const driveKey = await deriveDriveKey(drivePassword, driveId, JSON.stringify(privateKey));
		return new PrivateDriveKeyData(EID(driveId), driveKey);
	}
}

export interface ArFSMoveParams<O extends ArFSFileOrFolderEntity, T extends ArFSObjectTransactionData> {
	originalMetaData: O;
	newParentFolderId: FolderID;
	metaDataBaseReward: RewardSettings;
	transactionData: T;
}

export type GetDriveFunction = () => Promise<ArFSPublicDrive | ArFSPrivateDrive>;
export type CreateFolderFunction = (driveId: DriveID) => Promise<ArFSCreateFolderResult>;
export type GenerateDriveIdFn = () => DriveID;

export type ArFSListPrivateFolderParams = Required<ListPrivateFolderParams>;

export interface UploadPublicFileParams {
	parentFolderId: FolderID;
	wrappedFile: ArFSFileToUpload;
	driveId: DriveID;
	fileDataRewardSettings: RewardSettings;
	metadataRewardSettings: RewardSettings;
	destFileName?: string;
	existingFileId?: FileID;
}

export interface UploadPrivateFileParams extends UploadPublicFileParams {
	driveKey: DriveKey;
}

export type ArFSAllPrivateFoldersOfDriveParams = ArFSAllPublicFoldersOfDriveParams & WithDriveKey;

export interface CreateFolderSettings {
	driveId: DriveID;
	rewardSettings: RewardSettings;
	parentFolderId?: FolderID;
	syncParentFolderId?: boolean;
	owner: ArweaveAddress;
}

export interface CreatePublicFolderSettings extends CreateFolderSettings {
	folderData: ArFSPublicFolderTransactionData;
}

export interface CreatePrivateFolderSettings extends CreateFolderSettings {
	folderData: ArFSPrivateFolderTransactionData;
	driveKey: DriveKey;
}

interface getPublicChildrenFolderIdsParams {
	folderId: FolderID;
	driveId: DriveID;
	owner: ArweaveAddress;
}
interface getPrivateChildrenFolderIdsParams extends getPublicChildrenFolderIdsParams {
	driveKey: DriveKey;
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
	async createFolder(
		{ driveId, rewardSettings, parentFolderId, syncParentFolderId = true }: CreateFolderSettings,
		getDriveFn: GetDriveFunction,
		folderPrototypeFactory: FolderMetaDataFactory
	): Promise<ArFSCreateFolderResult> {
		if (parentFolderId && syncParentFolderId) {
			// Assert that drive ID is consistent with parent folder ID
			const actualDriveId = await this.getDriveIdForFolderId(parentFolderId);

			if (!actualDriveId.equals(driveId)) {
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
		const folderId = EID(uuidv4());

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

		return { metaDataTrxId: TxID(folderTrx.id), metaDataTrxReward: W(folderTrx.reward), folderId };
	}

	// Convenience wrapper for folder creation in a known-public use case
	async createPublicFolder({
		folderData,
		driveId,
		rewardSettings,
		parentFolderId,
		syncParentFolderId = true,
		owner
	}: CreatePublicFolderSettings): Promise<ArFSCreateFolderResult> {
		return this.createFolder(
			{ driveId, rewardSettings, parentFolderId, syncParentFolderId, owner },
			() => this.getPublicDrive(driveId, owner),
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
		syncParentFolderId = true,
		owner
	}: CreatePrivateFolderSettings): Promise<ArFSCreateFolderResult> {
		return this.createFolder(
			{ driveId, rewardSettings, parentFolderId, syncParentFolderId, owner },
			() => this.getPrivateDrive(driveId, driveKey, owner),
			(folderId, parentFolderId) =>
				new ArFSPrivateFolderMetaDataPrototype(driveId, folderId, folderData, parentFolderId)
		);
	}

	async createDrive<R extends ArFSCreateDriveResult>(
		driveRewardSettings: RewardSettings,
		generateDriveIdFn: GenerateDriveIdFn,
		createFolderFn: CreateFolderFunction,
		createMetadataFn: CreateDriveMetaDataFactory,
		resultFactory: ArFSCreateDriveResultFactory<R>
	): Promise<R> {
		// Generate a new drive ID  for the new drive
		const driveId = generateDriveIdFn();

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
			metaDataTrxId: TxID(driveTrx.id),
			metaDataTrxReward: W(driveTrx.reward),
			rootFolderTrxId: rootFolderTrxId,
			rootFolderTrxReward: rootFolderTrxReward,
			driveId: driveId,
			rootFolderId: rootFolderId
		});
	}

	async createPublicDrive(
		driveName: string,
		driveRewardSettings: RewardSettings,
		rootFolderRewardSettings: RewardSettings,
		owner: ArweaveAddress
	): Promise<ArFSCreateDriveResult> {
		return this.createDrive<ArFSCreateDriveResult>(
			driveRewardSettings,
			() => EID(uuidv4()),
			async (driveId) => {
				const folderData = new ArFSPublicFolderTransactionData(driveName);
				return this.createPublicFolder({
					folderData,
					driveId,
					rewardSettings: rootFolderRewardSettings,
					syncParentFolderId: false,
					owner
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
		rootFolderRewardSettings: RewardSettings,
		owner: ArweaveAddress
	): Promise<ArFSCreatePrivateDriveResult> {
		return this.createDrive(
			driveRewardSettings,
			() => newDriveData.driveId,
			async (driveId) => {
				const folderData = await ArFSPrivateFolderTransactionData.from(driveName, newDriveData.driveKey);
				return this.createPrivateFolder({
					folderData,
					driveId,
					rewardSettings: rootFolderRewardSettings,
					syncParentFolderId: false,
					driveKey: newDriveData.driveKey,
					owner
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

	async moveEntity<R extends ArFSMoveEntityResult>(
		metaDataBaseReward: RewardSettings,
		metaDataFactory: MoveEntityMetaDataFactory,
		resultFactory: ArFSMoveEntityResultFactory<R>
	): Promise<R> {
		const metadataPrototype = metaDataFactory();

		// Prepare meta data transaction
		const metaDataTrx = await this.prepareArFSObjectTransaction(metadataPrototype, metaDataBaseReward);

		// Upload meta data
		if (!this.dryRun) {
			const metaDataUploader = await this.arweave.transactions.getUploader(metaDataTrx);
			while (!metaDataUploader.isComplete) {
				await metaDataUploader.uploadChunk();
			}
		}

		return resultFactory({ metaDataTrxId: TxID(metaDataTrx.id), metaDataTrxReward: W(metaDataTrx.reward) });
	}

	async movePublicFile({
		metaDataBaseReward,
		originalMetaData,
		transactionData,
		newParentFolderId
	}: ArFSMoveParams<ArFSPublicFile, ArFSPublicFileMetadataTransactionData>): Promise<ArFSMovePublicFileResult> {
		return this.moveEntity<ArFSMovePublicFileResult>(
			metaDataBaseReward,
			() => {
				return new ArFSPublicFileMetaDataPrototype(
					transactionData,
					originalMetaData.driveId,
					originalMetaData.fileId,
					newParentFolderId
				);
			},
			(results) => {
				return { ...results, dataTrxId: originalMetaData.dataTxId };
			}
		);
	}

	async movePrivateFile({
		metaDataBaseReward,
		originalMetaData,
		transactionData,
		newParentFolderId
	}: ArFSMoveParams<ArFSPrivateFile, ArFSPrivateFileMetadataTransactionData>): Promise<ArFSMovePrivateFileResult> {
		return this.moveEntity<ArFSMovePrivateFileResult>(
			metaDataBaseReward,
			() => {
				return new ArFSPrivateFileMetaDataPrototype(
					transactionData,
					originalMetaData.driveId,
					originalMetaData.fileId,
					newParentFolderId
				);
			},
			(results) => {
				return { ...results, dataTrxId: originalMetaData.dataTxId, fileKey: transactionData.fileKey };
			}
		);
	}

	async movePublicFolder({
		metaDataBaseReward,
		originalMetaData,
		transactionData,
		newParentFolderId
	}: ArFSMoveParams<ArFSPublicFolder, ArFSPublicFolderTransactionData>): Promise<ArFSMovePublicFolderResult> {
		return this.moveEntity<ArFSMovePublicFolderResult>(
			metaDataBaseReward,
			() => {
				return new ArFSPublicFolderMetaDataPrototype(
					transactionData,
					originalMetaData.driveId,
					originalMetaData.entityId,
					newParentFolderId
				);
			},
			(results) => results
		);
	}

	async movePrivateFolder({
		metaDataBaseReward,
		originalMetaData,
		transactionData,
		newParentFolderId
	}: ArFSMoveParams<ArFSPrivateFolder, ArFSPrivateFolderTransactionData>): Promise<ArFSMovePrivateFolderResult> {
		return this.moveEntity<ArFSMovePrivateFolderResult>(
			metaDataBaseReward,
			() => {
				return new ArFSPrivateFolderMetaDataPrototype(
					originalMetaData.driveId,
					originalMetaData.entityId,
					transactionData,
					newParentFolderId
				);
			},
			(results) => {
				return { ...results, driveKey: transactionData.driveKey };
			}
		);
	}

	async uploadFile<R extends ArFSUploadFileResult, D extends ArFSFileMetadataTransactionData>(
		wrappedFile: ArFSFileToUpload,
		fileDataRewardSettings: RewardSettings,
		metadataRewardSettings: RewardSettings,
		dataPrototypeFactoryFn: FileDataPrototypeFactory,
		metadataTrxDataFactoryFn: FileMetadataTrxDataFactory<D>,
		metadataFactoryFn: FileMetaDataFactory<D>,
		resultFactoryFn: ArFSUploadFileResultFactory<R, D>,
		destFileName?: string,
		existingFileId?: FileID
	): Promise<R> {
		// Establish destination file name
		const destinationFileName = destFileName ?? wrappedFile.getBaseFileName();

		// Use existing file ID (create a revision) or generate new file ID
		const fileId = existingFileId ?? EID(uuidv4());

		// Gather file information
		const { fileSize, dataContentType, lastModifiedDateMS } = wrappedFile.gatherFileInfo();

		// Read file data into memory
		const fileData = wrappedFile.getFileDataBuffer();

		// Build file data transaction
		const fileDataPrototype = await dataPrototypeFactoryFn(fileData, dataContentType, fileId);
		const dataTrx = await this.prepareArFSObjectTransaction(fileDataPrototype, fileDataRewardSettings);

		// Upload file data
		if (!this.dryRun) {
			const dataUploader = await this.arweave.transactions.getUploader(dataTrx);
			while (!dataUploader.isComplete) {
				await dataUploader.uploadChunk();
			}
		}

		// Prepare meta data transaction
		const metadataTrxData = await metadataTrxDataFactoryFn(
			destinationFileName,
			fileSize,
			lastModifiedDateMS,
			TxID(dataTrx.id),
			dataContentType,
			fileId
		);
		const fileMetadata = metadataFactoryFn(metadataTrxData, fileId);
		const metaDataTrx = await this.prepareArFSObjectTransaction(fileMetadata, metadataRewardSettings);

		// Upload meta data
		if (!this.dryRun) {
			const metaDataUploader = await this.arweave.transactions.getUploader(metaDataTrx);
			while (!metaDataUploader.isComplete) {
				await metaDataUploader.uploadChunk();
			}
		}

		return resultFactoryFn(
			{
				dataTrxId: TxID(dataTrx.id),
				dataTrxReward: W(dataTrx.reward),
				metaDataTrxId: TxID(metaDataTrx.id),
				metaDataTrxReward: W(metaDataTrx.reward),
				fileId
			},
			metadataTrxData
		);
	}

	async uploadPublicFile({
		parentFolderId,
		wrappedFile,
		driveId,
		fileDataRewardSettings,
		metadataRewardSettings,
		destFileName,
		existingFileId
	}: UploadPublicFileParams): Promise<ArFSUploadFileResult> {
		return this.uploadFile(
			wrappedFile,
			fileDataRewardSettings,
			metadataRewardSettings,
			async (fileData, dataContentType) => {
				return new ArFSPublicFileDataPrototype(
					new ArFSPublicFileDataTransactionData(fileData),
					dataContentType
				);
			},
			async (destinationFileName, fileSize, lastModifiedDateMS, dataTrxId, dataContentType) => {
				return new ArFSPublicFileMetadataTransactionData(
					destinationFileName,
					fileSize,
					lastModifiedDateMS,
					dataTrxId,
					dataContentType
				);
			},
			(metadataTrxData, fileId) => {
				return new ArFSPublicFileMetaDataPrototype(metadataTrxData, driveId, fileId, parentFolderId);
			},
			(result) => result, // no change
			destFileName,
			existingFileId
		);
	}

	async uploadPrivateFile({
		parentFolderId,
		wrappedFile,
		driveId,
		driveKey,
		fileDataRewardSettings,
		metadataRewardSettings,
		destFileName,
		existingFileId
	}: UploadPrivateFileParams): Promise<ArFSUploadPrivateFileResult> {
		return this.uploadFile(
			wrappedFile,
			fileDataRewardSettings,
			metadataRewardSettings,
			async (fileData, _dataContentType, fileId) => {
				const trxData = await ArFSPrivateFileDataTransactionData.from(fileData, fileId, driveKey);
				return new ArFSPrivateFileDataPrototype(trxData);
			},
			async (destinationFileName, fileSize, lastModifiedDateMS, dataTrxId, dataContentType, fileId) => {
				return await ArFSPrivateFileMetadataTransactionData.from(
					destinationFileName,
					fileSize,
					lastModifiedDateMS,
					dataTrxId,
					dataContentType,
					fileId,
					driveKey
				);
			},
			(metadataTrxData, fileId) => {
				return new ArFSPrivateFileMetaDataPrototype(metadataTrxData, driveId, fileId, parentFolderId);
			},
			(result, trxData) => {
				return { ...result, fileKey: trxData.fileKey }; // add the file key to the result data
			},
			destFileName,
			existingFileId
		);
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
			trxAttributes.reward = rewardSettings.reward.toString();
		}

		// TODO: Use a mock arweave server instead
		if (process.env.NODE_ENV === 'test') {
			trxAttributes.last_tx = 'STUB';
		}

		const transaction = await this.arweave.createTransaction(trxAttributes, wallet.getPrivateKey());

		// If we've opted to boost the transaction, do so now
		if (rewardSettings.feeMultiple?.wouldBoostReward()) {
			transaction.reward = rewardSettings.feeMultiple.boostReward(transaction.reward);
		}

		// Add baseline ArFS Tags
		transaction.addTag('App-Name', this.appName);
		transaction.addTag('App-Version', this.appVersion);
		transaction.addTag('ArFS', CURRENT_ARFS_VERSION);
		if (rewardSettings.feeMultiple?.wouldBoostReward()) {
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

	// Convenience function for known-private use cases
	async getPrivateDrive(driveId: DriveID, driveKey: DriveKey, owner: ArweaveAddress): Promise<ArFSPrivateDrive> {
		return new ArFSPrivateDriveBuilder({ entityId: driveId, arweave: this.arweave, key: driveKey, owner }).build();
	}

	// Convenience function for known-private use cases
	async getPrivateFolder(folderId: FolderID, driveKey: DriveKey, owner: ArweaveAddress): Promise<ArFSPrivateFolder> {
		return new ArFSPrivateFolderBuilder(folderId, this.arweave, driveKey, owner).build();
	}

	async getPrivateFile(fileId: FileID, driveKey: DriveKey, owner: ArweaveAddress): Promise<ArFSPrivateFile> {
		return new ArFSPrivateFileBuilder(fileId, this.arweave, driveKey, owner).build();
	}

	async getAllFoldersOfPrivateDrive({
		driveId,
		driveKey,
		owner,
		latestRevisionsOnly = false
	}: ArFSAllPrivateFoldersOfDriveParams): Promise<ArFSPrivateFolder[]> {
		let cursor = '';
		let hasNextPage = true;
		const allFolders: ArFSPrivateFolder[] = [];

		while (hasNextPage) {
			const gqlQuery = buildQuery({
				tags: [
					{ name: 'Drive-Id', value: `${driveId}` },
					{ name: 'Entity-Type', value: 'folder' }
				],
				cursor,
				owner
			});

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
		owner: ArweaveAddress,
		latestRevisionsOnly = false
	): Promise<ArFSPrivateFile[]> {
		let cursor = '';
		let hasNextPage = true;
		const allFiles: ArFSPrivateFile[] = [];

		while (hasNextPage) {
			const gqlQuery = buildQuery({
				tags: [
					{ name: 'Parent-Folder-Id', value: folderIDs.map((fid) => fid.toString()) },
					{ name: 'Entity-Type', value: 'file' }
				],
				cursor,
				owner
			});

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

	async getEntitiesInFolder(
		parentFolderId: FolderID,
		builder: (
			node: GQLNodeInterface,
			entityType: 'file' | 'folder'
		) => ArFSFileOrFolderBuilder<ArFSFileOrFolderEntity>,
		latestRevisionsOnly = true,
		filterOnOwner = true
	): Promise<ArFSFileOrFolderEntity[]> {
		let cursor = '';
		let hasNextPage = true;
		const allEntities: ArFSFileOrFolderEntity[] = [];

		// TODO: Derive the owner of a wallet from earliest transaction of a drive by default
		const owner = await this.wallet.getAddress();

		while (hasNextPage) {
			const gqlQuery = buildQuery({
				tags: [
					{ name: 'Parent-Folder-Id', value: `${parentFolderId}` },
					{ name: 'Entity-Type', value: ['file', 'folder'] }
				],
				cursor,
				owner: filterOnOwner ? owner : undefined
			});

			const response = await this.arweave.api.post(graphQLURL, gqlQuery);
			const { data } = response.data;
			const { transactions } = data;
			const { edges } = transactions;
			hasNextPage = transactions.pageInfo.hasNextPage;

			const folders: Promise<ArFSFileOrFolderEntity>[] = edges.map(async (edge: GQLEdgeInterface) => {
				const { node } = edge;
				cursor = edge.cursor;
				const { tags } = node;

				// Check entityType to determine which builder to use
				const entityType = tags.find((t) => t.name === 'Entity-Type')?.value;
				if (!entityType || (entityType !== 'file' && entityType !== 'folder')) {
					throw new Error('Entity-Type tag is missing or invalid!');
				}

				return builder(node, entityType).build(node);
			});

			allEntities.push(...(await Promise.all(folders)));
		}
		return latestRevisionsOnly ? allEntities.filter(latestRevisionFilter) : allEntities;
	}

	async getPrivateEntitiesInFolder(
		parentFolderId: FolderID,
		driveKey: DriveKey,
		latestRevisionsOnly = true
	): Promise<ArFSFileOrFolderEntity[]> {
		return this.getEntitiesInFolder(
			parentFolderId,
			(node, entityType) =>
				entityType === 'folder'
					? ArFSPrivateFolderBuilder.fromArweaveNode(node, this.arweave, driveKey)
					: ArFSPrivateFileBuilder.fromArweaveNode(node, this.arweave, driveKey),
			latestRevisionsOnly
		);
	}

	async getPublicEntitiesInFolder(
		parentFolderId: FolderID,
		latestRevisionsOnly = true
	): Promise<ArFSFileOrFolderEntity[]> {
		return this.getEntitiesInFolder(
			parentFolderId,
			(node, entityType) =>
				entityType === 'folder'
					? ArFSPublicFolderBuilder.fromArweaveNode(node, this.arweave)
					: ArFSPublicFileBuilder.fromArweaveNode(node, this.arweave),
			latestRevisionsOnly
		);
	}

	async getChildrenFolderIds(
		folderId: FolderID,
		allFolderEntitiesOfDrive: ArFSFileOrFolderEntity[]
	): Promise<FolderID[]> {
		const hierarchy = FolderHierarchy.newFromEntities(allFolderEntitiesOfDrive);
		return hierarchy.folderIdSubtreeFromFolderId(folderId, Number.MAX_SAFE_INTEGER);
	}

	async getPrivateEntityNamesInFolder(folderId: FolderID, driveKey: DriveKey): Promise<string[]> {
		const childrenOfFolder = await this.getPrivateEntitiesInFolder(folderId, driveKey, true);
		return childrenOfFolder.map(entityToNameMap);
	}

	async getPublicEntityNamesInFolder(folderId: FolderID): Promise<string[]> {
		const childrenOfFolder = await this.getPublicEntitiesInFolder(folderId, true);
		return childrenOfFolder.map(entityToNameMap);
	}

	async getPublicNameConflictInfoInFolder(folderId: FolderID): Promise<EntityNamesAndIds> {
		const childrenOfFolder = await this.getPublicEntitiesInFolder(folderId, true);
		return {
			files: childrenOfFolder.filter(fileFilter).map(fileConflictInfoMap),
			folders: childrenOfFolder.filter(folderFilter).map(folderToNameAndIdMap)
		};
	}

	async getPrivateNameConflictInfoInFolder(folderId: FolderID, driveKey: DriveKey): Promise<EntityNamesAndIds> {
		const childrenOfFolder = await this.getPrivateEntitiesInFolder(folderId, driveKey, true);
		return {
			files: childrenOfFolder.filter(fileFilter).map(fileConflictInfoMap),
			folders: childrenOfFolder.filter(folderFilter).map(folderToNameAndIdMap)
		};
	}

	async getPrivateChildrenFolderIds({
		folderId,
		driveId,
		driveKey,
		owner
	}: getPrivateChildrenFolderIdsParams): Promise<FolderID[]> {
		return this.getChildrenFolderIds(
			folderId,
			await this.getAllFoldersOfPrivateDrive({ driveId, driveKey, owner, latestRevisionsOnly: true })
		);
	}

	async getPublicChildrenFolderIds({
		folderId,
		owner,
		driveId
	}: getPublicChildrenFolderIdsParams): Promise<FolderID[]> {
		return this.getChildrenFolderIds(
			folderId,
			await this.getAllFoldersOfPublicDrive({ driveId, owner, latestRevisionsOnly: true })
		);
	}

	/**
	 * Lists the children of certain private folder
	 * @param {FolderID} folderId the folder ID to list children of
	 * @param {DriveKey} driveKey the drive key used for drive and folder data decryption and file key derivation
	 * @param {number} maxDepth a non-negative integer value indicating the depth of the folder tree to list where 0 = this folder's contents only
	 * @param {boolean} includeRoot whether or not folderId's folder data should be included in the listing
	 * @returns {ArFSPrivateFileOrFolderWithPaths[]} an array representation of the children and parent folder
	 */
	async listPrivateFolder({
		folderId,
		driveKey,
		maxDepth,
		includeRoot,
		owner
	}: ArFSListPrivateFolderParams): Promise<ArFSPrivateFileOrFolderWithPaths[]> {
		if (!Number.isInteger(maxDepth) || maxDepth < 0) {
			throw new Error('maxDepth should be a non-negative integer!');
		}

		const folder = await this.getPrivateFolder(folderId, driveKey, owner);

		// Fetch all of the folder entities within the drive
		const driveIdOfFolder = folder.driveId;
		const allFolderEntitiesOfDrive = await this.getAllFoldersOfPrivateDrive({
			driveId: driveIdOfFolder,
			driveKey,
			owner,
			latestRevisionsOnly: true
		});

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
		const childrenFileEntities = await this.getPrivateFilesWithParentFolderIds(
			searchFolderIDs,
			driveKey,
			owner,
			true
		);

		const children = [...childrenFolderEntities, ...childrenFileEntities];

		const entitiesWithPath = children.map((entity) => new ArFSPrivateFileOrFolderWithPaths(entity, hierarchy));
		return entitiesWithPath;
	}

	async assertValidPassword(password: string): Promise<void> {
		const wallet = this.wallet;
		const walletAddress = await wallet.getAddress();
		const query = buildQuery({
			tags: [
				{ name: 'Entity-Type', value: 'drive' },
				{ name: 'Drive-Privacy', value: 'private' }
			],
			owner: walletAddress,
			sort: ASCENDING_ORDER
		});
		const response = await this.arweave.api.post(graphQLURL, query);
		const { data } = response.data;
		const { transactions } = data;
		const { edges } = transactions;
		if (!edges.length) {
			// No drive has been created for this wallet
			return;
		}
		const { node }: { node: GQLNodeInterface } = edges[0];
		const safeDriveBuilder = SafeArFSDriveBuilder.fromArweaveNode(
			node,
			this.arweave,
			new PrivateKeyData({ password, wallet: this.wallet as JWKWallet })
		);
		const safelyBuiltDrive = await safeDriveBuilder.build();
		if (
			safelyBuiltDrive.name === ENCRYPTED_DATA_PLACEHOLDER ||
			`${safelyBuiltDrive.rootFolderId}` === ENCRYPTED_DATA_PLACEHOLDER
		) {
			throw new Error(`Invalid password! Please type the same as your other private drives!`);
		}
	}
}
