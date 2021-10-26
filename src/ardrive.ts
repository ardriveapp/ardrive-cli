import { ArFSDAO, PrivateDriveKeyData } from './arfsdao';
import { CommunityOracle } from './community/community_oracle';
import { ArFSDriveEntity, deriveDriveKey, DrivePrivacy, GQLTagInterface, winstonToAr } from 'ardrive-core-js';
import {
	TransactionID,
	Winston,
	DriveID,
	FolderID,
	TipType,
	FeeMultiple,
	DriveKey,
	EntityID,
	FileID,
	ByteCount,
	MakeOptional
} from './types';
import { WalletDAO, Wallet, JWKWallet } from './wallet_new';
import { ARDataPriceRegressionEstimator } from './utils/ar_data_price_regression_estimator';
import { ArFSFolderToUpload, ArFSFileToUpload } from './arfs_file_wrapper';
import { ARDataPriceEstimator } from './utils/ar_data_price_estimator';
import {
	ArFSDriveTransactionData,
	ArFSFileMetadataTransactionData,
	ArFSFolderTransactionData,
	ArFSObjectTransactionData,
	ArFSPrivateDriveTransactionData,
	ArFSPrivateFileMetadataTransactionData,
	ArFSPrivateFolderTransactionData,
	ArFSPublicDriveTransactionData,
	ArFSPublicFileMetadataTransactionData,
	ArFSPublicFolderTransactionData
} from './arfs_trx_data_types';
import { urlEncodeHashKey } from './utils';
import { ArFSDAOAnonymous, ArFSDAOType, ArFSListPublicFolderParams } from './arfsdao_anonymous';
import {
	ArFSPrivateDrive,
	ArFSPrivateFile,
	ArFSPrivateFileOrFolderWithPaths,
	ArFSPrivateFolder,
	ArFSPublicDrive,
	ArFSPublicFile,
	ArFSPublicFileOrFolderWithPaths,
	ArFSPublicFolder
} from './arfs_entities';
import { stubEntityID, stubTransactionID } from './utils/stubs';
import { errorMessage } from './error_message';
import { PrivateKeyData } from './private_key_data';
import { EntityNamesAndIds } from './utils/mapper_functions';
import { ArweaveAddress } from './arweave_address';
import { WithDriveKey } from './arfs_entity_result_factory';

export type ArFSEntityDataType = 'drive' | 'folder' | 'file';

export interface ArFSEntityData {
	type: ArFSEntityDataType;
	metadataTxId: TransactionID;
	dataTxId?: TransactionID;
	entityId: EntityID;
	key?: string;
}

export type ListPublicFolderParams = MakeOptional<ArFSListPublicFolderParams, 'maxDepth' | 'includeRoot' | 'owner'>;
export type ListPrivateFolderParams = ListPublicFolderParams & WithDriveKey;

export interface TipData {
	txId: TransactionID;
	recipient: ArweaveAddress;
	winston: Winston;
}

export interface TipResult {
	tipData: TipData;
	reward: Winston;
}

export type ArFSFees = { [key: string]: number };

export interface ArFSResult {
	created: ArFSEntityData[];
	tips: TipData[];
	fees: ArFSFees;
}

export interface MetaDataBaseCosts {
	metaDataBaseReward: Winston;
}

export interface BulkFileBaseCosts extends MetaDataBaseCosts {
	fileDataBaseReward: Winston;
}
export interface FileUploadBaseCosts extends BulkFileBaseCosts {
	communityWinstonTip: Winston;
}

export interface DriveUploadBaseCosts {
	driveMetaDataBaseReward: Winston;
	rootFolderMetaDataBaseReward: Winston;
}

interface RecursivePublicBulkUploadParams {
	parentFolderId: FolderID;
	wrappedFolder: ArFSFolderToUpload;
	driveId: DriveID;
	owner: ArweaveAddress;
}
type RecursivePrivateBulkUploadParams = RecursivePublicBulkUploadParams & WithDriveKey;

interface CreatePublicFolderParams {
	folderName: string;
	driveId: DriveID;
	parentFolderId: FolderID;
}
type CreatePrivateFolderParams = CreatePublicFolderParams & WithDriveKey;

interface MovePublicFolderParams {
	folderId: FolderID;
	newParentFolderId: FolderID;
}
type MovePrivateFolderParams = MovePublicFolderParams & WithDriveKey;

export abstract class ArDriveType {
	protected abstract readonly arFsDao: ArFSDAOType;
}

export class ArDriveAnonymous extends ArDriveType {
	constructor(protected readonly arFsDao: ArFSDAOAnonymous) {
		super();
	}

	async getOwnerForDriveId(driveId: DriveID): Promise<ArweaveAddress> {
		return this.arFsDao.getOwnerForDriveId(driveId);
	}

	async getPublicDrive(driveId: DriveID, owner?: ArweaveAddress): Promise<ArFSPublicDrive> {
		if (!owner) {
			owner = await this.getOwnerForDriveId(driveId);
		}

		return this.arFsDao.getPublicDrive(driveId, owner);
	}

	async getPublicFolder(folderId: FolderID, owner?: ArweaveAddress): Promise<ArFSPublicFolder> {
		if (!owner) {
			owner = await this.arFsDao.getDriveOwnerForFolderId(folderId);
		}

		return this.arFsDao.getPublicFolder(folderId, owner);
	}

	async getPublicFile(fileId: FileID, owner?: ArweaveAddress): Promise<ArFSPublicFile> {
		if (!owner) {
			owner = await this.arFsDao.getDriveOwnerForFileId(fileId);
		}

		return this.arFsDao.getPublicFile(fileId, owner);
	}

	async getAllDrivesForAddress(address: ArweaveAddress, privateKeyData: PrivateKeyData): Promise<ArFSDriveEntity[]> {
		return this.arFsDao.getAllDrivesForAddress(address, privateKeyData);
	}

	/**
	 * Lists the children of certain public folder
	 * @param {FolderID} folderId the folder ID to list children of
	 * @returns {ArFSPublicFileOrFolderWithPaths[]} an array representation of the children and parent folder
	 */
	async listPublicFolder({
		folderId,
		maxDepth = 0,
		includeRoot = false,
		owner
	}: ListPublicFolderParams): Promise<ArFSPublicFileOrFolderWithPaths[]> {
		if (!owner) {
			owner = await this.arFsDao.getDriveOwnerForFolderId(folderId);
		}

		const children = await this.arFsDao.listPublicFolder({ folderId, maxDepth, includeRoot, owner });
		return children;
	}
}

export class ArDrive extends ArDriveAnonymous {
	constructor(
		private readonly wallet: Wallet,
		private readonly walletDao: WalletDAO,
		protected readonly arFsDao: ArFSDAO,
		private readonly communityOracle: CommunityOracle,
		private readonly appName: string,
		private readonly appVersion: string,
		private readonly priceEstimator: ARDataPriceEstimator = new ARDataPriceRegressionEstimator(true),
		private readonly feeMultiple: FeeMultiple = 1.0,
		private readonly dryRun: boolean = false
	) {
		super(arFsDao);
	}

	// NOTE: Presumes that there's a sufficient wallet balance
	async sendCommunityTip(communityWinstonTip: Winston, assertBalance = false): Promise<TipResult> {
		const tokenHolder: ArweaveAddress = await this.communityOracle.selectTokenHolder();
		const arTransferBaseFee = await this.priceEstimator.getBaseWinstonPriceForByteCount(0);

		const transferResult = await this.walletDao.sendARToAddress(
			winstonToAr(+communityWinstonTip),
			this.wallet,
			tokenHolder,
			{ reward: arTransferBaseFee.toString(), feeMultiple: this.feeMultiple },
			this.dryRun,
			this.getTipTags(),
			assertBalance
		);

		return {
			tipData: { txId: transferResult.trxID, recipient: tokenHolder, winston: communityWinstonTip },
			reward: transferResult.reward
		};
	}

	getTipTags(tipType: TipType = 'data upload'): GQLTagInterface[] {
		return [
			{ name: 'App-Name', value: this.appName },
			{ name: 'App-Version', value: this.appVersion },
			{ name: 'Tip-Type', value: tipType }
		];
	}

	async movePublicFile(fileId: FileID, newParentFolderId: FolderID): Promise<ArFSResult> {
		const destFolderDriveId = await this.arFsDao.getDriveIdForFolderId(newParentFolderId);

		const owner = await this.getOwnerForDriveId(destFolderDriveId);
		await this.assertOwnerAddress(owner);

		const originalFileMetaData = await this.getPublicFile(fileId);

		if (destFolderDriveId !== originalFileMetaData.driveId) {
			throw new Error(errorMessage.cannotMoveToDifferentDrive);
		}

		if (originalFileMetaData.parentFolderId === newParentFolderId) {
			throw new Error(errorMessage.cannotMoveIntoSamePlace('File', newParentFolderId));
		}

		// Assert that there are no duplicate names in the destination folder
		const entityNamesInParentFolder = await this.arFsDao.getPublicEntityNamesInFolder(newParentFolderId);
		if (entityNamesInParentFolder.includes(originalFileMetaData.name)) {
			// TODO: Add optional interactive prompt to resolve name conflicts in ticket PE-599
			throw new Error(errorMessage.entityNameExists);
		}

		const fileTransactionData = new ArFSPublicFileMetadataTransactionData(
			originalFileMetaData.name,
			originalFileMetaData.size,
			originalFileMetaData.lastModifiedDate,
			originalFileMetaData.dataTxId,
			originalFileMetaData.dataContentType
		);

		const moveFileBaseCosts = await this.estimateAndAssertCostOfMoveFile(fileTransactionData);
		const fileMetaDataBaseReward = { reward: moveFileBaseCosts.metaDataBaseReward, feeMultiple: this.feeMultiple };

		// Move file will create a new meta data tx with identical meta data except for a new parentFolderId
		const moveFileResult = await this.arFsDao.movePublicFile({
			originalMetaData: originalFileMetaData,
			transactionData: fileTransactionData,
			newParentFolderId,
			metaDataBaseReward: fileMetaDataBaseReward
		});

		return Promise.resolve({
			created: [
				{
					type: 'file',
					metadataTxId: moveFileResult.metaDataTrxId,
					dataTxId: moveFileResult.dataTrxId,
					entityId: fileId
				}
			],
			tips: [],
			fees: {
				[moveFileResult.metaDataTrxId]: +moveFileResult.metaDataTrxReward
			}
		});
	}

	async movePrivateFile(fileId: FileID, newParentFolderId: FolderID, driveKey: DriveKey): Promise<ArFSResult> {
		const destFolderDriveId = await this.arFsDao.getDriveIdForFolderId(newParentFolderId);

		const owner = await this.getOwnerForDriveId(destFolderDriveId);
		await this.assertOwnerAddress(owner);

		const originalFileMetaData = await this.getPrivateFile(fileId, driveKey);

		if (destFolderDriveId !== originalFileMetaData.driveId) {
			throw new Error(errorMessage.cannotMoveToDifferentDrive);
		}

		if (originalFileMetaData.parentFolderId === newParentFolderId) {
			throw new Error(errorMessage.cannotMoveIntoSamePlace('File', newParentFolderId));
		}

		// Assert that there are no duplicate names in the destination folder
		const entityNamesInParentFolder = await this.arFsDao.getPrivateEntityNamesInFolder(newParentFolderId, driveKey);
		if (entityNamesInParentFolder.includes(originalFileMetaData.name)) {
			// TODO: Add optional interactive prompt to resolve name conflicts in ticket PE-599
			throw new Error(errorMessage.entityNameExists);
		}

		const fileTransactionData = await ArFSPrivateFileMetadataTransactionData.from(
			originalFileMetaData.name,
			originalFileMetaData.size,
			originalFileMetaData.lastModifiedDate,
			originalFileMetaData.dataTxId,
			originalFileMetaData.dataContentType,
			fileId,
			driveKey
		);

		const moveFileBaseCosts = await this.estimateAndAssertCostOfMoveFile(fileTransactionData);
		const fileMetaDataBaseReward = { reward: moveFileBaseCosts.metaDataBaseReward, feeMultiple: this.feeMultiple };

		// Move file will create a new meta data tx with identical meta data except for a new parentFolderId
		const moveFileResult = await this.arFsDao.movePrivateFile({
			originalMetaData: originalFileMetaData,
			transactionData: fileTransactionData,
			newParentFolderId,
			metaDataBaseReward: fileMetaDataBaseReward
		});

		return Promise.resolve({
			created: [
				{
					type: 'file',
					metadataTxId: moveFileResult.metaDataTrxId,
					dataTxId: moveFileResult.dataTrxId,
					entityId: fileId,
					key: urlEncodeHashKey(moveFileResult.fileKey)
				}
			],
			tips: [],
			fees: {
				[moveFileResult.metaDataTrxId]: +moveFileResult.metaDataTrxReward
			}
		});
	}

	async movePublicFolder({ folderId, newParentFolderId }: MovePublicFolderParams): Promise<ArFSResult> {
		if (folderId === newParentFolderId) {
			throw new Error(errorMessage.folderCannotMoveIntoItself);
		}

		const destFolderDriveId = await this.arFsDao.getDriveIdForFolderId(newParentFolderId);

		const owner = await this.getOwnerForDriveId(destFolderDriveId);
		await this.assertOwnerAddress(owner);

		const originalFolderMetaData = await this.getPublicFolder(folderId);

		if (destFolderDriveId !== originalFolderMetaData.driveId) {
			throw new Error(errorMessage.cannotMoveToDifferentDrive);
		}

		if (originalFolderMetaData.parentFolderId === newParentFolderId) {
			throw new Error(errorMessage.cannotMoveIntoSamePlace('Folder', newParentFolderId));
		}

		// Assert that there are no duplicate names in the destination folder
		const entityNamesInParentFolder = await this.arFsDao.getPublicEntityNamesInFolder(newParentFolderId);
		if (entityNamesInParentFolder.includes(originalFolderMetaData.name)) {
			// TODO: Add optional interactive prompt to resolve name conflicts in ticket PE-599
			throw new Error(errorMessage.entityNameExists);
		}

		const childrenFolderIds = await this.arFsDao.getPublicChildrenFolderIds({
			folderId,
			driveId: destFolderDriveId
		});

		if (childrenFolderIds.includes(newParentFolderId)) {
			throw new Error(errorMessage.cannotMoveParentIntoChildFolder);
		}

		const folderTransactionData = new ArFSPublicFolderTransactionData(originalFolderMetaData.name);
		const { metaDataBaseReward: baseReward } = await this.estimateAndAssertCostOfFolderUpload(
			folderTransactionData
		);

		const folderMetaDataBaseReward = { reward: baseReward, feeMultiple: this.feeMultiple };

		// Move folder will create a new meta data tx with identical meta data except for a new parentFolderId
		const moveFolderResult = await this.arFsDao.movePublicFolder({
			originalMetaData: originalFolderMetaData,
			transactionData: folderTransactionData,
			newParentFolderId,
			metaDataBaseReward: folderMetaDataBaseReward
		});

		return Promise.resolve({
			created: [
				{
					type: 'folder',
					metadataTxId: moveFolderResult.metaDataTrxId,
					entityId: folderId
				}
			],
			tips: [],
			fees: {
				[moveFolderResult.metaDataTrxId]: +moveFolderResult.metaDataTrxReward
			}
		});
	}

	async movePrivateFolder({ folderId, newParentFolderId, driveKey }: MovePrivateFolderParams): Promise<ArFSResult> {
		if (folderId === newParentFolderId) {
			throw new Error(errorMessage.folderCannotMoveIntoItself);
		}

		const destFolderDriveId = await this.arFsDao.getDriveIdForFolderId(newParentFolderId);

		const owner = await this.getOwnerForDriveId(destFolderDriveId);
		await this.assertOwnerAddress(owner);

		const originalFolderMetaData = await this.getPrivateFolder(folderId, driveKey);

		if (destFolderDriveId !== originalFolderMetaData.driveId) {
			throw new Error(errorMessage.cannotMoveToDifferentDrive);
		}

		if (originalFolderMetaData.parentFolderId === newParentFolderId) {
			throw new Error(errorMessage.cannotMoveIntoSamePlace('Folder', newParentFolderId));
		}

		// Assert that there are no duplicate names in the destination folder
		const entityNamesInParentFolder = await this.arFsDao.getPrivateEntityNamesInFolder(newParentFolderId, driveKey);
		if (entityNamesInParentFolder.includes(originalFolderMetaData.name)) {
			// TODO: Add optional interactive prompt to resolve name conflicts in ticket PE-599
			throw new Error(errorMessage.entityNameExists);
		}

		const childrenFolderIds = await this.arFsDao.getPrivateChildrenFolderIds({
			folderId,
			driveId: destFolderDriveId,
			driveKey
		});

		if (childrenFolderIds.includes(newParentFolderId)) {
			throw new Error(errorMessage.cannotMoveParentIntoChildFolder);
		}

		const folderTransactionData = await ArFSPrivateFolderTransactionData.from(
			originalFolderMetaData.name,
			driveKey
		);
		const { metaDataBaseReward: baseReward } = await this.estimateAndAssertCostOfFolderUpload(
			folderTransactionData
		);

		const folderMetaDataBaseReward = { reward: baseReward, feeMultiple: this.feeMultiple };

		// Move folder will create a new meta data tx with identical meta data except for a new parentFolderId
		const moveFolderResult = await this.arFsDao.movePrivateFolder({
			originalMetaData: originalFolderMetaData,
			transactionData: folderTransactionData,
			newParentFolderId,
			metaDataBaseReward: folderMetaDataBaseReward
		});

		return Promise.resolve({
			created: [
				{
					type: 'folder',
					metadataTxId: moveFolderResult.metaDataTrxId,
					entityId: folderId,
					key: urlEncodeHashKey(moveFolderResult.driveKey)
				}
			],
			tips: [],
			fees: {
				[moveFolderResult.metaDataTrxId]: +moveFolderResult.metaDataTrxReward
			}
		});
	}

	async uploadPublicFile(
		parentFolderId: FolderID,
		wrappedFile: ArFSFileToUpload,
		destinationFileName?: string
	): Promise<ArFSResult> {
		const driveId = await this.arFsDao.getDriveIdForFolderId(parentFolderId);

		const owner = await this.getOwnerForDriveId(driveId);
		await this.assertOwnerAddress(owner);

		// Derive destination name and names already within provided destination folder
		const destFileName = destinationFileName ?? wrappedFile.getBaseFileName();
		const filesAndFolderNames = await this.arFsDao.getPublicEntityNamesAndIdsInFolder(parentFolderId);

		// Files cannot overwrite folder names
		if (filesAndFolderNames.folders.find((f) => f.folderName === destFileName)) {
			// TODO: Add optional interactive prompt to resolve name conflicts in ticket PE-599
			throw new Error(errorMessage.entityNameExists);
		}

		// File is a new revision if destination name conflicts
		// with an existing file in the destination folder
		const existingFileId = filesAndFolderNames.files.find((f) => f.fileName === destFileName)?.fileId;

		const uploadBaseCosts = await this.estimateAndAssertCostOfFileUpload(
			wrappedFile.fileStats.size,
			this.stubPublicFileMetadata(wrappedFile, destinationFileName),
			'public'
		);
		const fileDataRewardSettings = { reward: uploadBaseCosts.fileDataBaseReward, feeMultiple: this.feeMultiple };
		const metadataRewardSettings = { reward: uploadBaseCosts.metaDataBaseReward, feeMultiple: this.feeMultiple };

		const uploadFileResult = await this.arFsDao.uploadPublicFile({
			parentFolderId,
			wrappedFile,
			driveId,
			fileDataRewardSettings,
			metadataRewardSettings,
			destFileName: destinationFileName,
			existingFileId
		});

		const { tipData, reward: communityTipTrxReward } = await this.sendCommunityTip(
			uploadBaseCosts.communityWinstonTip
		);

		return Promise.resolve({
			created: [
				{
					type: 'file',
					metadataTxId: uploadFileResult.metaDataTrxId,
					dataTxId: uploadFileResult.dataTrxId,
					entityId: uploadFileResult.fileId
				}
			],
			tips: [tipData],
			fees: {
				[uploadFileResult.dataTrxId]: +uploadFileResult.dataTrxReward,
				[uploadFileResult.metaDataTrxId]: +uploadFileResult.metaDataTrxReward,
				[tipData.txId]: +communityTipTrxReward
			}
		});
	}

	public async createPublicFolderAndUploadChildren(
		parentFolderId: FolderID,
		wrappedFolder: ArFSFolderToUpload,
		parentFolderName?: string
	): Promise<ArFSResult> {
		const driveId = await this.arFsDao.getDriveIdForFolderId(parentFolderId);

		const owner = await this.getOwnerForDriveId(driveId);
		await this.assertOwnerAddress(owner);

		// Derive destination name and names already within provided destination folder
		const destFolderName = parentFolderName ?? wrappedFolder.getBaseFileName();
		const filesAndFolderNames = await this.arFsDao.getPublicEntityNamesAndIdsInFolder(parentFolderId);

		// Folders cannot overwrite file names
		if (filesAndFolderNames.files.find((f) => f.fileName === destFolderName)) {
			// TODO: Add optional interactive prompt to resolve name conflicts in ticket PE-599
			throw new Error(errorMessage.entityNameExists);
		}

		// Use existing folder id if the intended destination name
		// conflicts with an existing folder in the destination folder
		wrappedFolder.existingId = filesAndFolderNames.folders.find((f) => f.folderName === destFolderName)?.folderId;
		wrappedFolder.destinationName = parentFolderName;

		// Check for conflicting names and assign existing IDs for later use
		await this.checkAndAssignExistingPublicNames(wrappedFolder);

		// Estimate and assert the cost of the entire bulk upload
		// This will assign the calculated base costs to each wrapped file and folder
		const bulkEstimation = await this.estimateAndAssertCostOfBulkUpload(wrappedFolder);

		// TODO: Add interactive confirmation of price estimation before uploading

		const results = await this.recursivelyCreatePublicFolderAndUploadChildren({
			parentFolderId,
			wrappedFolder,
			driveId,
			owner: await this.wallet.getAddress()
		});

		if (+bulkEstimation.communityWinstonTip > 0) {
			// Send community tip only if communityWinstonTip has a value
			// This can be zero when a user uses this method to upload empty folders

			const { tipData, reward: communityTipTrxReward } = await this.sendCommunityTip(
				bulkEstimation.communityWinstonTip
			);

			return Promise.resolve({
				created: results.entityResults,
				tips: [tipData],
				fees: { ...results.feeResults, [tipData.txId]: +communityTipTrxReward }
			});
		}

		return Promise.resolve({
			created: results.entityResults,
			tips: [],
			fees: results.feeResults
		});
	}

	protected async recursivelyCreatePublicFolderAndUploadChildren({
		parentFolderId,
		wrappedFolder,
		driveId,
		owner
	}: RecursivePublicBulkUploadParams): Promise<{
		entityResults: ArFSEntityData[];
		feeResults: ArFSFees;
	}> {
		let uploadEntityFees: ArFSFees = {};
		let uploadEntityResults: ArFSEntityData[] = [];
		let folderId: FolderID;

		if (wrappedFolder.existingId) {
			// Use existing parent folder ID for bulk upload
			folderId = wrappedFolder.existingId;
		} else {
			// Create the parent folder
			const folderData = new ArFSPublicFolderTransactionData(
				wrappedFolder.destinationName ?? wrappedFolder.getBaseFileName()
			);

			const createFolderResult = await this.arFsDao.createPublicFolder({
				folderData: folderData,
				driveId,
				rewardSettings: {
					reward: wrappedFolder.getBaseCosts().metaDataBaseReward,
					feeMultiple: this.feeMultiple
				},
				parentFolderId,
				syncParentFolderId: false,
				owner
			});

			const { metaDataTrxId, folderId: newFolderId, metaDataTrxReward } = createFolderResult;

			// Capture parent folder results
			uploadEntityFees = { [metaDataTrxId]: +metaDataTrxReward };
			uploadEntityResults = [
				{
					type: 'folder',
					metadataTxId: metaDataTrxId,
					entityId: newFolderId
				}
			];

			folderId = newFolderId;
		}

		// Upload all files in the folder
		for await (const wrappedFile of wrappedFolder.files) {
			const fileDataRewardSettings = {
				reward: wrappedFile.getBaseCosts().fileDataBaseReward,
				feeMultiple: this.feeMultiple
			};

			const metadataRewardSettings = {
				reward: wrappedFile.getBaseCosts().metaDataBaseReward,
				feeMultiple: this.feeMultiple
			};

			const uploadFileResult = await this.arFsDao.uploadPublicFile({
				parentFolderId: folderId,
				wrappedFile,
				driveId,
				fileDataRewardSettings,
				metadataRewardSettings,
				existingFileId: wrappedFile.existingId
			});

			// Capture all file results
			uploadEntityFees = {
				...uploadEntityFees,
				[uploadFileResult.dataTrxId]: +uploadFileResult.dataTrxReward,
				[uploadFileResult.metaDataTrxId]: +uploadFileResult.metaDataTrxReward
			};
			uploadEntityResults = [
				...uploadEntityResults,
				{
					type: 'file',
					metadataTxId: uploadFileResult.metaDataTrxId,
					dataTxId: uploadFileResult.dataTrxId,
					entityId: uploadFileResult.fileId
				}
			];
		}

		// Upload folders, and children of those folders
		for await (const childFolder of wrappedFolder.folders) {
			// Recursion alert, will keep creating folders of all nested folders
			const results = await this.recursivelyCreatePublicFolderAndUploadChildren({
				parentFolderId: folderId,
				wrappedFolder: childFolder,
				driveId,
				owner
			});

			// Capture all folder results
			uploadEntityFees = {
				...uploadEntityFees,
				...results.feeResults
			};
			uploadEntityResults = [...uploadEntityResults, ...results.entityResults];
		}

		return {
			entityResults: uploadEntityResults,
			feeResults: uploadEntityFees
		};
	}

	/** Computes the size of a private file encrypted with AES256-GCM */
	encryptedDataSize(dataSize: ByteCount): ByteCount {
		if (dataSize < 0 || !Number.isInteger(dataSize)) {
			throw new Error(`dataSize must be non-negative, integer value! ${dataSize} is invalid!`);
		}
		if (dataSize > Number.MAX_SAFE_INTEGER - 16) {
			throw new Error(`Max un-encrypted dataSize allowed is ${Number.MAX_SAFE_INTEGER - 16}!`);
		}
		const modulo16 = dataSize % 16;
		return dataSize - modulo16 + 16;
	}

	async uploadPrivateFile(
		parentFolderId: FolderID,
		wrappedFile: ArFSFileToUpload,
		driveKey: DriveKey,
		destinationFileName?: string
	): Promise<ArFSResult> {
		const driveId = await this.arFsDao.getDriveIdForFolderId(parentFolderId);

		const owner = await this.getOwnerForDriveId(driveId);
		await this.assertOwnerAddress(owner);

		// Derive destination name and names already within provided destination folder
		const destFileName = destinationFileName ?? wrappedFile.getBaseFileName();
		const filesAndFolderNames = await this.arFsDao.getPrivateEntityNamesAndIdsInFolder(parentFolderId, driveKey);

		// Files cannot overwrite folder names
		if (filesAndFolderNames.folders.find((f) => f.folderName === destFileName)) {
			// TODO: Add optional interactive prompt to resolve name conflicts in ticket PE-599
			throw new Error(errorMessage.entityNameExists);
		}

		// File is a new revision if destination name conflicts
		// with an existing file in the destination folder
		const existingFileId = filesAndFolderNames.files.find((f) => f.fileName === destFileName)?.fileId;

		const uploadBaseCosts = await this.estimateAndAssertCostOfFileUpload(
			wrappedFile.fileStats.size,
			await this.stubPrivateFileMetadata(wrappedFile, destinationFileName),
			'private'
		);

		const fileDataRewardSettings = {
			reward: uploadBaseCosts.fileDataBaseReward,
			feeMultiple: this.feeMultiple
		};
		const metadataRewardSettings = {
			reward: uploadBaseCosts.metaDataBaseReward,
			feeMultiple: this.feeMultiple
		};

		// TODO: Add interactive confirmation of AR price estimation

		const uploadFileResult = await this.arFsDao.uploadPrivateFile({
			parentFolderId,
			wrappedFile,
			driveId,
			driveKey,
			fileDataRewardSettings,
			metadataRewardSettings,
			destFileName: destinationFileName,
			existingFileId
		});

		const { tipData, reward: communityTipTrxReward } = await this.sendCommunityTip(
			uploadBaseCosts.communityWinstonTip
		);

		return Promise.resolve({
			created: [
				{
					type: 'file',
					metadataTxId: uploadFileResult.metaDataTrxId,
					dataTxId: uploadFileResult.dataTrxId,
					entityId: uploadFileResult.fileId,
					key: urlEncodeHashKey(uploadFileResult.fileKey)
				}
			],
			tips: [tipData],
			fees: {
				[uploadFileResult.dataTrxId]: +uploadFileResult.dataTrxReward,
				[uploadFileResult.metaDataTrxId]: +uploadFileResult.metaDataTrxReward,
				[tipData.txId]: +communityTipTrxReward
			}
		});
	}

	public async createPrivateFolderAndUploadChildren(
		parentFolderId: FolderID,
		wrappedFolder: ArFSFolderToUpload,
		driveKey: DriveKey,
		parentFolderName?: string
	): Promise<ArFSResult> {
		// Retrieve drive ID from folder ID
		const driveId = await this.arFsDao.getDriveIdForFolderId(parentFolderId);

		// Get owner of drive, will error if no drives are found
		const owner = await this.getOwnerForDriveId(driveId);

		// Assert that the provided wallet is the owner of the drive
		await this.assertOwnerAddress(owner);

		// Derive destination name and names already within provided destination folder
		const destFolderName = parentFolderName ?? wrappedFolder.getBaseFileName();
		const filesAndFolderNames = await this.arFsDao.getPrivateEntityNamesAndIdsInFolder(parentFolderId, driveKey);

		// Folders cannot overwrite file names
		if (filesAndFolderNames.files.find((f) => f.fileName === destFolderName)) {
			// TODO: Add optional interactive prompt to resolve name conflicts in ticket PE-599
			throw new Error(errorMessage.entityNameExists);
		}

		// Use existing folder id if the intended destination name
		// conflicts with an existing folder in the destination folder
		wrappedFolder.existingId = filesAndFolderNames.folders.find((f) => f.folderName === destFolderName)?.folderId;
		wrappedFolder.destinationName = parentFolderName;

		// Check for conflicting names and assign existing IDs for later use
		await this.checkAndAssignExistingPrivateNames(wrappedFolder, driveKey);

		// Estimate and assert the cost of the entire bulk upload
		// This will assign the calculated base costs to each wrapped file and folder
		const bulkEstimation = await this.estimateAndAssertCostOfBulkUpload(wrappedFolder, driveKey);

		// TODO: Add interactive confirmation of price estimation before uploading

		const results = await this.recursivelyCreatePrivateFolderAndUploadChildren({
			parentFolderId,
			wrappedFolder,
			driveKey,
			driveId,
			owner
		});

		if (+bulkEstimation.communityWinstonTip > 0) {
			// Send community tip only if communityWinstonTip has a value
			// This can be zero when a user uses this method to upload empty folders

			const { tipData, reward: communityTipTrxReward } = await this.sendCommunityTip(
				bulkEstimation.communityWinstonTip
			);

			return Promise.resolve({
				created: results.entityResults,
				tips: [tipData],
				fees: { ...results.feeResults, [tipData.txId]: +communityTipTrxReward }
			});
		}

		return Promise.resolve({
			created: results.entityResults,
			tips: [],
			fees: results.feeResults
		});
	}

	protected async checkAndAssignExistingNames(
		wrappedFolder: ArFSFolderToUpload,
		getExistingNamesFn: (parentFolderId: FolderID) => Promise<EntityNamesAndIds>
	): Promise<void> {
		if (!wrappedFolder.existingId) {
			// Folder has no existing ID to check
			return;
		}

		const existingEntityNamesAndIds = await getExistingNamesFn(wrappedFolder.existingId);

		for await (const file of wrappedFolder.files) {
			const baseFileName = file.getBaseFileName();

			const folderNameConflict = existingEntityNamesAndIds.folders.find(
				({ folderName }) => folderName === baseFileName
			);

			// File name cannot conflict with a folder name
			if (folderNameConflict) {
				throw new Error(errorMessage.entityNameExists);
			}

			const fileNameConflict = existingEntityNamesAndIds.files.find(({ fileName }) => fileName === baseFileName);

			// Conflicting file name creates a REVISION by default
			if (fileNameConflict) {
				// Assigns existing id for later use
				file.existingId = fileNameConflict.fileId;
			}
		}

		for await (const folder of wrappedFolder.folders) {
			const baseFolderName = folder.getBaseFileName();

			const fileNameConflict = existingEntityNamesAndIds.files.find(
				({ fileName }) => fileName === baseFolderName
			);

			// Folder name cannot conflict with a file name
			if (fileNameConflict) {
				throw new Error(errorMessage.entityNameExists);
			}

			const folderNameConflict = existingEntityNamesAndIds.folders.find(
				({ folderName }) => folderName === baseFolderName
			);

			// Conflicting folder name uses EXISTING folder by default
			if (folderNameConflict) {
				// Assigns existing id for later use
				folder.existingId = folderNameConflict.folderId;

				// Recurse into existing folder on folder name conflict
				await this.checkAndAssignExistingNames(folder, getExistingNamesFn);
			}
		}
	}

	protected async checkAndAssignExistingPublicNames(wrappedFolder: ArFSFolderToUpload): Promise<void> {
		await this.checkAndAssignExistingNames(wrappedFolder, (parentFolderId) =>
			this.arFsDao.getPublicEntityNamesAndIdsInFolder(parentFolderId)
		);
	}

	protected async checkAndAssignExistingPrivateNames(
		wrappedFolder: ArFSFolderToUpload,
		driveKey: DriveKey
	): Promise<void> {
		await this.checkAndAssignExistingNames(wrappedFolder, (parentFolderId) =>
			this.arFsDao.getPrivateEntityNamesAndIdsInFolder(parentFolderId, driveKey)
		);
	}

	protected async recursivelyCreatePrivateFolderAndUploadChildren({
		wrappedFolder,
		driveId,
		parentFolderId,
		driveKey,
		owner
	}: RecursivePrivateBulkUploadParams): Promise<{
		entityResults: ArFSEntityData[];
		feeResults: ArFSFees;
	}> {
		let uploadEntityFees: ArFSFees = {};
		let uploadEntityResults: ArFSEntityData[] = [];
		let folderId: FolderID;

		if (wrappedFolder.existingId) {
			// Use existing parent folder ID for bulk upload.
			// This happens when the parent folder's name conflicts
			folderId = wrappedFolder.existingId;
		} else {
			// Create parent folder
			const folderData = await ArFSPrivateFolderTransactionData.from(
				wrappedFolder.destinationName ?? wrappedFolder.getBaseFileName(),
				driveKey
			);
			const createFolderResult = await this.arFsDao.createPrivateFolder({
				folderData: folderData,
				driveId,
				rewardSettings: {
					reward: wrappedFolder.getBaseCosts().metaDataBaseReward,
					feeMultiple: this.feeMultiple
				},
				parentFolderId,
				driveKey,
				syncParentFolderId: false,
				owner
			});

			const { metaDataTrxId, folderId: newFolderId, metaDataTrxReward } = createFolderResult;

			// Capture parent folder results
			uploadEntityFees = { [metaDataTrxId]: +metaDataTrxReward };
			uploadEntityResults = [
				{
					type: 'folder',
					metadataTxId: metaDataTrxId,
					entityId: newFolderId,
					key: urlEncodeHashKey(driveKey)
				}
			];

			folderId = newFolderId;
		}

		// Upload all files in the folder
		for await (const wrappedFile of wrappedFolder.files) {
			const fileDataRewardSettings = {
				reward: wrappedFile.getBaseCosts().fileDataBaseReward,
				feeMultiple: this.feeMultiple
			};
			const metadataRewardSettings = {
				reward: wrappedFile.getBaseCosts().metaDataBaseReward,
				feeMultiple: this.feeMultiple
			};

			const uploadFileResult = await this.arFsDao.uploadPrivateFile({
				parentFolderId: folderId,
				wrappedFile,
				driveId,
				driveKey,
				fileDataRewardSettings,
				metadataRewardSettings,
				existingFileId: wrappedFile.existingId
			});

			// Capture all file results
			uploadEntityFees = {
				...uploadEntityFees,
				[uploadFileResult.dataTrxId]: +uploadFileResult.dataTrxReward,
				[uploadFileResult.metaDataTrxId]: +uploadFileResult.metaDataTrxReward
			};
			uploadEntityResults = [
				...uploadEntityResults,
				{
					type: 'file',
					metadataTxId: uploadFileResult.metaDataTrxId,
					dataTxId: uploadFileResult.dataTrxId,
					entityId: uploadFileResult.fileId,
					key: urlEncodeHashKey(uploadFileResult.fileKey)
				}
			];
		}

		// Upload folders, and children of those folders
		for await (const childFolder of wrappedFolder.folders) {
			// Recursion alert, will keep creating folders of all nested folders
			const results = await this.recursivelyCreatePrivateFolderAndUploadChildren({
				parentFolderId: folderId,
				wrappedFolder: childFolder,
				driveId,
				driveKey,
				owner
			});

			// Capture all folder results
			uploadEntityFees = {
				...uploadEntityFees,
				...results.feeResults
			};
			uploadEntityResults = [...uploadEntityResults, ...results.entityResults];
		}

		return {
			entityResults: uploadEntityResults,
			feeResults: uploadEntityFees
		};
	}

	async createPublicFolder({ folderName, driveId, parentFolderId }: CreatePublicFolderParams): Promise<ArFSResult> {
		const owner = await this.getOwnerForDriveId(driveId);
		await this.assertOwnerAddress(owner);

		// Assert that there are no duplicate names in the destination folder
		const entityNamesInParentFolder = await this.arFsDao.getPublicEntityNamesInFolder(parentFolderId);
		if (entityNamesInParentFolder.includes(folderName)) {
			// TODO: Add optional interactive prompt to resolve name conflicts in ticket PE-599
			throw new Error(errorMessage.entityNameExists);
		}

		// Assert that there's enough AR available in the wallet
		const folderData = new ArFSPublicFolderTransactionData(folderName);
		const { metaDataBaseReward } = await this.estimateAndAssertCostOfFolderUpload(folderData);

		// Create the folder and retrieve its folder ID
		const { metaDataTrxId, metaDataTrxReward, folderId } = await this.arFsDao.createPublicFolder({
			folderData,
			driveId,
			rewardSettings: { reward: metaDataBaseReward, feeMultiple: this.feeMultiple },
			parentFolderId,
			owner
		});

		// IN THE FUTURE WE MIGHT SEND A COMMUNITY TIP HERE
		return Promise.resolve({
			created: [
				{
					type: 'folder',
					metadataTxId: metaDataTrxId,
					entityId: folderId
				}
			],
			tips: [],
			fees: {
				[metaDataTrxId]: +metaDataTrxReward
			}
		});
	}

	async createPrivateFolder({
		folderName,
		driveId,
		driveKey,
		parentFolderId
	}: CreatePrivateFolderParams): Promise<ArFSResult> {
		const owner = await this.getOwnerForDriveId(driveId);
		await this.assertOwnerAddress(owner);

		// Assert that there are no duplicate names in the destination folder
		const entityNamesInParentFolder = await this.arFsDao.getPrivateEntityNamesInFolder(parentFolderId, driveKey);
		if (entityNamesInParentFolder.includes(folderName)) {
			// TODO: Add optional interactive prompt to resolve name conflicts in ticket PE-599
			throw new Error(errorMessage.entityNameExists);
		}

		// Assert that there's enough AR available in the wallet
		const folderData = await ArFSPrivateFolderTransactionData.from(folderName, driveKey);
		const { metaDataBaseReward } = await this.estimateAndAssertCostOfFolderUpload(folderData);

		// Create the folder and retrieve its folder ID
		const { metaDataTrxId, metaDataTrxReward, folderId } = await this.arFsDao.createPrivateFolder({
			folderData,
			driveId,
			rewardSettings: { reward: metaDataBaseReward, feeMultiple: this.feeMultiple },
			driveKey,
			parentFolderId,
			owner
		});

		// IN THE FUTURE WE MIGHT SEND A COMMUNITY TIP HERE
		return Promise.resolve({
			created: [
				{
					type: 'folder',
					metadataTxId: metaDataTrxId,
					entityId: folderId,
					key: urlEncodeHashKey(driveKey)
				}
			],
			tips: [],
			fees: {
				[metaDataTrxId]: +metaDataTrxReward
			}
		});
	}

	async createPublicDrive(driveName: string): Promise<ArFSResult> {
		// Assert that there's enough AR available in the wallet
		// Use stub data to estimate costs since actual data requires entity IDs generated by ArFSDao
		const stubRootFolderData = new ArFSPublicFolderTransactionData(driveName);
		const stubDriveData = new ArFSPublicDriveTransactionData(driveName, stubEntityID);
		const driveUploadCosts = await this.estimateAndAssertCostOfDriveCreation(stubDriveData, stubRootFolderData);
		const driveRewardSettings = {
			reward: driveUploadCosts.driveMetaDataBaseReward,
			feeMultiple: this.feeMultiple
		};
		const rootFolderRewardSettings = {
			reward: driveUploadCosts.rootFolderMetaDataBaseReward,
			feeMultiple: this.feeMultiple
		};
		const createDriveResult = await this.arFsDao.createPublicDrive(
			driveName,
			driveRewardSettings,
			rootFolderRewardSettings,
			// There is no need to assert ownership during drive creation
			await this.wallet.getAddress()
		);
		return Promise.resolve({
			created: [
				{
					type: 'drive',
					metadataTxId: createDriveResult.metaDataTrxId,
					entityId: createDriveResult.driveId
				},
				{
					type: 'folder',
					metadataTxId: createDriveResult.rootFolderTrxId,
					entityId: createDriveResult.rootFolderId
				}
			],
			tips: [],
			fees: {
				[createDriveResult.metaDataTrxId]: +createDriveResult.metaDataTrxReward,
				[createDriveResult.rootFolderTrxId]: +createDriveResult.rootFolderTrxReward
			}
		});
	}

	async createPrivateDrive(driveName: string, newPrivateDriveData: PrivateDriveKeyData): Promise<ArFSResult> {
		// Assert that there's enough AR available in the wallet
		const stubRootFolderData = await ArFSPrivateFolderTransactionData.from(driveName, newPrivateDriveData.driveKey);
		const stubDriveData = await ArFSPrivateDriveTransactionData.from(
			driveName,
			stubEntityID,
			newPrivateDriveData.driveKey
		);
		const driveCreationCosts = await this.estimateAndAssertCostOfDriveCreation(stubDriveData, stubRootFolderData);
		const driveRewardSettings = {
			reward: driveCreationCosts.driveMetaDataBaseReward,
			feeMultiple: this.feeMultiple
		};
		const rootFolderRewardSettings = {
			reward: driveCreationCosts.rootFolderMetaDataBaseReward,
			feeMultiple: this.feeMultiple
		};
		const createDriveResult = await this.arFsDao.createPrivateDrive(
			driveName,
			newPrivateDriveData,
			driveRewardSettings,
			rootFolderRewardSettings,
			// Ownership of drive has been verified by assertValidPassword successfully decrypting
			await this.wallet.getAddress()
		);

		// IN THE FUTURE WE MIGHT SEND A COMMUNITY TIP HERE
		return Promise.resolve({
			created: [
				{
					type: 'drive',
					metadataTxId: createDriveResult.metaDataTrxId,
					entityId: createDriveResult.driveId,
					key: urlEncodeHashKey(createDriveResult.driveKey)
				},
				{
					type: 'folder',
					metadataTxId: createDriveResult.rootFolderTrxId,
					entityId: createDriveResult.rootFolderId,
					key: urlEncodeHashKey(createDriveResult.driveKey)
				}
			],
			tips: [],
			fees: {
				[createDriveResult.metaDataTrxId]: +createDriveResult.metaDataTrxReward,
				[createDriveResult.rootFolderTrxId]: +createDriveResult.rootFolderTrxReward
			}
		});
	}

	/**
	 * Utility function to estimate and assert the cost of a bulk upload
	 *
	 * @remarks This function will recurse into the folder contents of the provided folderToUpload
	 *
	 * @throws when the wallet does not contain enough AR for the bulk upload
	 *
	 * @param folderToUpload The wrapped folder to estimate the cost of
	 * @param driveKey Optional parameter to determine whether to estimate the cost of a private or public upload
	 * @param isParentFolder Boolean to determine whether to Assert the total cost. This parameter
	 *   is only to be handled as false internally within the recursive function. Always use default
	 *   of TRUE when calling this method
	 *  */
	async estimateAndAssertCostOfBulkUpload(
		folderToUpload: ArFSFolderToUpload,
		driveKey?: DriveKey,
		isParentFolder = true
	): Promise<{ totalPrice: Winston; totalFilePrice: Winston; communityWinstonTip: Winston }> {
		let totalPrice = 0;
		let totalFilePrice = 0;

		if (!folderToUpload.existingId) {
			// Don't estimate cost of folder metadata if using existing folder
			const folderMetadataTrxData = await (async () => {
				const folderName = folderToUpload.destinationName ?? folderToUpload.getBaseFileName();

				if (driveKey) {
					return ArFSPrivateFolderTransactionData.from(folderName, driveKey);
				}
				return new ArFSPublicFolderTransactionData(folderName);
			})();
			const metaDataBaseReward = await this.priceEstimator.getBaseWinstonPriceForByteCount(
				folderMetadataTrxData.sizeOf()
			);
			const parentFolderWinstonPrice = metaDataBaseReward.toString();

			// Assign base costs to folder
			folderToUpload.baseCosts = { metaDataBaseReward: parentFolderWinstonPrice };

			totalPrice += +parentFolderWinstonPrice;
		}

		for await (const file of folderToUpload.files) {
			const fileSize = driveKey ? file.encryptedDataSize() : file.fileStats.size;

			const fileDataBaseReward = await this.priceEstimator.getBaseWinstonPriceForByteCount(fileSize);

			const stubFileMetaData = driveKey
				? await this.stubPrivateFileMetadata(file, file.getBaseFileName())
				: this.stubPublicFileMetadata(file, file.getBaseFileName());
			const metaDataBaseReward = await this.priceEstimator.getBaseWinstonPriceForByteCount(
				stubFileMetaData.sizeOf()
			);

			totalPrice += fileDataBaseReward;
			totalPrice += metaDataBaseReward;

			totalFilePrice += fileDataBaseReward;

			// Assign base costs to the file
			file.baseCosts = {
				fileDataBaseReward: fileDataBaseReward.toString(),
				metaDataBaseReward: metaDataBaseReward.toString()
			};
		}

		for await (const folder of folderToUpload.folders) {
			const childFolderResults = await this.estimateAndAssertCostOfBulkUpload(folder, driveKey, false);

			totalPrice += +childFolderResults.totalPrice;
			totalFilePrice += +childFolderResults.totalFilePrice;
		}

		const totalWinstonPrice = totalPrice.toString();
		let communityWinstonTip = '0';

		if (isParentFolder) {
			if (totalFilePrice > 0) {
				communityWinstonTip = await this.communityOracle.getCommunityWinstonTip(String(totalFilePrice));
			}

			// Check and assert balance of the total bulk upload if this folder is the parent folder
			const walletHasBalance = await this.walletDao.walletHasBalance(
				this.wallet,
				String(+communityWinstonTip + +totalWinstonPrice)
			);

			if (!walletHasBalance) {
				const walletBalance = await this.walletDao.getWalletWinstonBalance(this.wallet);

				throw new Error(
					`Wallet balance of ${walletBalance} Winston is not enough (${totalWinstonPrice}) for data upload of size ${folderToUpload.getTotalByteCount(
						driveKey !== undefined
					)} bytes!`
				);
			}
		}

		return { totalPrice: String(totalPrice), totalFilePrice: String(totalFilePrice), communityWinstonTip };
	}

	async assertOwnerAddress(owner: ArweaveAddress): Promise<void> {
		if (!owner.equalsAddress(await this.wallet.getAddress())) {
			throw new Error('Supplied wallet is not the owner of this drive!');
		}
	}

	async getPrivateDrive(driveId: DriveID, driveKey: DriveKey, owner?: ArweaveAddress): Promise<ArFSPrivateDrive> {
		if (!owner) {
			owner = await this.getOwnerForDriveId(driveId);
		}
		await this.assertOwnerAddress(owner);

		return this.arFsDao.getPrivateDrive(driveId, driveKey, owner);
	}

	async getPrivateFolder(folderId: FolderID, driveKey: DriveKey, owner?: ArweaveAddress): Promise<ArFSPrivateFolder> {
		if (!owner) {
			owner = await this.arFsDao.getDriveOwnerForFolderId(folderId);
		}
		await this.assertOwnerAddress(owner);

		return this.arFsDao.getPrivateFolder(folderId, driveKey, owner);
	}

	async getPrivateFile(fileId: FileID, driveKey: DriveKey, owner?: ArweaveAddress): Promise<ArFSPrivateFile> {
		if (!owner) {
			owner = await this.arFsDao.getDriveOwnerForFileId(fileId);
		}
		await this.assertOwnerAddress(owner);

		return this.arFsDao.getPrivateFile(fileId, driveKey, owner);
	}

	/**
	 * Lists the children of certain private folder
	 * @param {FolderID} folderId the folder ID to list children of
	 * @returns {ArFSPrivateFileOrFolderWithPaths[]} an array representation of the children and parent folder
	 */
	async listPrivateFolder({
		folderId,
		driveKey,
		maxDepth = 0,
		includeRoot = false,
		owner
	}: ListPrivateFolderParams): Promise<ArFSPrivateFileOrFolderWithPaths[]> {
		if (!owner) {
			owner = await this.arFsDao.getDriveOwnerForFolderId(folderId);
		}
		await this.assertOwnerAddress(owner);

		const children = this.arFsDao.listPrivateFolder({ folderId, driveKey, maxDepth, includeRoot, owner });
		return children;
	}

	async estimateAndAssertCostOfMoveFile(
		fileTransactionData: ArFSFileMetadataTransactionData
	): Promise<MetaDataBaseCosts> {
		const fileMetaTransactionDataReward = String(
			await this.priceEstimator.getBaseWinstonPriceForByteCount(fileTransactionData.sizeOf())
		);

		const walletHasBalance = await this.walletDao.walletHasBalance(this.wallet, fileMetaTransactionDataReward);

		if (!walletHasBalance) {
			const walletBalance = await this.walletDao.getWalletWinstonBalance(this.wallet);

			throw new Error(
				`Wallet balance of ${walletBalance} Winston is not enough (${fileMetaTransactionDataReward}) for moving file!`
			);
		}

		return { metaDataBaseReward: fileMetaTransactionDataReward };
	}

	async estimateAndAssertCostOfFileUpload(
		decryptedFileSize: ByteCount,
		metaData: ArFSObjectTransactionData,
		drivePrivacy: DrivePrivacy
	): Promise<FileUploadBaseCosts> {
		if (decryptedFileSize < 0 || !Number.isInteger(decryptedFileSize)) {
			throw new Error('File size should be non-negative integer number!');
		}

		let fileSize = decryptedFileSize;
		if (drivePrivacy === 'private') {
			fileSize = this.encryptedDataSize(fileSize);
		}

		let totalPrice = 0;
		let fileDataBaseReward = 0;
		let communityWinstonTip = '0';
		if (fileSize) {
			fileDataBaseReward = await this.priceEstimator.getBaseWinstonPriceForByteCount(fileSize);
			communityWinstonTip = await this.communityOracle.getCommunityWinstonTip(fileDataBaseReward.toString());
			const tipReward = await this.priceEstimator.getBaseWinstonPriceForByteCount(0);
			totalPrice += fileDataBaseReward;
			totalPrice += +communityWinstonTip;
			totalPrice += tipReward;
		}
		const metaDataBaseReward = await this.priceEstimator.getBaseWinstonPriceForByteCount(metaData.sizeOf());
		totalPrice += metaDataBaseReward;

		const totalWinstonPrice = totalPrice.toString();

		const walletHasBalance = await this.walletDao.walletHasBalance(this.wallet, totalWinstonPrice);

		if (!walletHasBalance) {
			const walletBalance = await this.walletDao.getWalletWinstonBalance(this.wallet);

			throw new Error(
				`Wallet balance of ${walletBalance} Winston is not enough (${totalWinstonPrice}) for data upload of size ${fileSize} bytes!`
			);
		}

		return {
			fileDataBaseReward: fileDataBaseReward.toString(),
			metaDataBaseReward: metaDataBaseReward.toString(),
			communityWinstonTip
		};
	}

	async estimateAndAssertCostOfFolderUpload(metaData: ArFSObjectTransactionData): Promise<MetaDataBaseCosts> {
		const metaDataBaseReward = await this.priceEstimator.getBaseWinstonPriceForByteCount(metaData.sizeOf());
		const totalWinstonPrice = metaDataBaseReward.toString();

		const walletHasBalance = await this.walletDao.walletHasBalance(this.wallet, totalWinstonPrice);

		if (!walletHasBalance) {
			const walletBalance = await this.walletDao.getWalletWinstonBalance(this.wallet);

			throw new Error(
				`Wallet balance of ${walletBalance} Winston is not enough (${totalWinstonPrice}) for folder creation!`
			);
		}

		return {
			metaDataBaseReward: totalWinstonPrice
		};
	}

	async estimateAndAssertCostOfDriveCreation(
		driveMetaData: ArFSDriveTransactionData,
		rootFolderMetaData: ArFSFolderTransactionData
	): Promise<DriveUploadBaseCosts> {
		let totalPrice = 0;
		const driveMetaDataBaseReward = await this.priceEstimator.getBaseWinstonPriceForByteCount(
			driveMetaData.sizeOf()
		);
		totalPrice += driveMetaDataBaseReward;
		const rootFolderMetaDataBaseReward = await this.priceEstimator.getBaseWinstonPriceForByteCount(
			rootFolderMetaData.sizeOf()
		);
		totalPrice += rootFolderMetaDataBaseReward;

		const totalWinstonPrice = totalPrice.toString();

		const walletHasBalance = await this.walletDao.walletHasBalance(this.wallet, totalWinstonPrice);

		if (!walletHasBalance) {
			const walletBalance = await this.walletDao.getWalletWinstonBalance(this.wallet);

			throw new Error(
				`Wallet balance of ${walletBalance} Winston is not enough (${totalPrice}) for drive creation!`
			);
		}

		return {
			driveMetaDataBaseReward: driveMetaDataBaseReward.toString(),
			rootFolderMetaDataBaseReward: rootFolderMetaDataBaseReward.toString()
		};
	}

	async getDriveIdForFileId(fileId: FileID): Promise<DriveID> {
		return this.arFsDao.getDriveIdForFileId(fileId);
	}

	async getDriveIdForFolderId(folderId: FolderID): Promise<DriveID> {
		return this.arFsDao.getDriveIdForFolderId(folderId);
	}

	// Provides for stubbing metadata during cost estimations since the data trx ID won't yet be known
	private stubPublicFileMetadata(
		wrappedFile: ArFSFileToUpload,
		destinationFileName?: string
	): ArFSPublicFileMetadataTransactionData {
		const { fileSize, dataContentType, lastModifiedDateMS } = wrappedFile.gatherFileInfo();

		return new ArFSPublicFileMetadataTransactionData(
			destinationFileName ?? wrappedFile.getBaseFileName(),
			fileSize,
			lastModifiedDateMS,
			stubTransactionID,
			dataContentType
		);
	}

	// Provides for stubbing metadata during cost estimations since the data trx and File IDs won't yet be known
	private async stubPrivateFileMetadata(
		wrappedFile: ArFSFileToUpload,
		destinationFileName?: string
	): Promise<ArFSPrivateFileMetadataTransactionData> {
		const { fileSize, dataContentType, lastModifiedDateMS } = wrappedFile.gatherFileInfo();

		return await ArFSPrivateFileMetadataTransactionData.from(
			destinationFileName ?? wrappedFile.getBaseFileName(),
			fileSize,
			lastModifiedDateMS,
			stubTransactionID,
			dataContentType,
			stubEntityID,
			await deriveDriveKey(
				'stubPassword',
				stubEntityID,
				JSON.stringify((this.wallet as JWKWallet).getPrivateKey())
			)
		);
	}

	async assertValidPassword(password: string): Promise<void> {
		await this.arFsDao.assertValidPassword(password);
	}
}
