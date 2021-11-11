import { ArFSDAO } from './arfsdao';
import { UploadPrivateFileParams, UploadPublicFileParams } from './ardrive.types';
import { CommunityOracle } from './community/community_oracle';
import { deriveDriveKey, deriveFileKey, DrivePrivacy, GQLTagInterface } from 'ardrive-core-js';
import {
	DriveID,
	FolderID,
	TipType,
	DriveKey,
	ArweaveAddress,
	ByteCount,
	W,
	Winston,
	AR,
	FeeMultiple,
	FileID,
	stubTransactionID,
	CipherIV
} from './types';
import { WalletDAO, Wallet, JWKWallet } from './wallet';
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
import {
	ArFSPrivateDrive,
	ArFSPrivateFile,
	ArFSPrivateFileOrFolderWithPaths,
	ArFSPrivateFolder
} from './arfs_entities';
import { stubEntityID } from './utils/stubs';
import { errorMessage } from './error_message';
import { ArDriveAnonymous } from './ardrive_anonymous';
import { pipeline } from 'stream';
import { StreamDecrypt } from './utils/stream_decrypt';
import { createWriteStream } from 'fs';
import { mkdir } from 'fs';
import { join as joinPath } from 'path';
import { promisify } from 'util';
import {
	CommunityTipParams,
	TipResult,
	MovePublicFileParams,
	ArFSResult,
	MovePrivateFileParams,
	MovePublicFolderParams,
	MovePrivateFolderParams,
	upsertOnConflicts,
	skipOnConflicts,
	emptyArFSResult,
	BulkPublicUploadParams,
	RecursivePublicBulkUploadParams,
	ArFSEntityData,
	ArFSFees,
	BulkPrivateUploadParams,
	RecursivePrivateBulkUploadParams,
	CreatePublicFolderParams,
	CreatePrivateFolderParams,
	CreatePublicDriveParams,
	FileNameConflictResolution,
	GetPrivateDriveParams,
	GetPrivateFolderParams,
	GetPrivateFileParams,
	ListPrivateFolderParams,
	MetaDataBaseCosts,
	FileUploadBaseCosts,
	DriveUploadBaseCosts,
	CreatePrivateDriveParams
} from './ardrive.types';

const mkdirPromise = promisify(mkdir);
const pipelinePromise = promisify(pipeline);

export type ArFSEntityDataType = 'drive' | 'folder' | 'file';

export class ArDrive extends ArDriveAnonymous {
	constructor(
		private readonly wallet: Wallet,
		private readonly walletDao: WalletDAO,
		protected readonly arFsDao: ArFSDAO,
		private readonly communityOracle: CommunityOracle,
		private readonly appName: string,
		private readonly appVersion: string,
		private readonly priceEstimator: ARDataPriceEstimator = new ARDataPriceRegressionEstimator(true),
		private readonly feeMultiple: FeeMultiple = new FeeMultiple(1.0),
		private readonly dryRun: boolean = false
	) {
		super(arFsDao);
	}

	// NOTE: Presumes that there's a sufficient wallet balance
	async sendCommunityTip({ communityWinstonTip, assertBalance = false }: CommunityTipParams): Promise<TipResult> {
		const tokenHolder: ArweaveAddress = await this.communityOracle.selectTokenHolder();
		const arTransferBaseFee = await this.priceEstimator.getBaseWinstonPriceForByteCount(new ByteCount(0));

		const transferResult = await this.walletDao.sendARToAddress(
			new AR(communityWinstonTip),
			this.wallet,
			tokenHolder,
			{ reward: arTransferBaseFee, feeMultiple: this.feeMultiple },
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
			{ name: 'Type', value: 'fee' },
			{ name: 'Tip-Type', value: tipType }
		];
	}

	public async movePublicFile({ fileId, newParentFolderId }: MovePublicFileParams): Promise<ArFSResult> {
		const destFolderDriveId = await this.arFsDao.getDriveIdForFolderId(newParentFolderId);

		const owner = await this.getOwnerForDriveId(destFolderDriveId);
		await this.assertOwnerAddress(owner);

		const originalFileMetaData = await this.getPublicFile({ fileId });

		if (!destFolderDriveId.equals(originalFileMetaData.driveId)) {
			throw new Error(errorMessage.cannotMoveToDifferentDrive);
		}

		if (originalFileMetaData.parentFolderId.equals(newParentFolderId)) {
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
				[`${moveFileResult.metaDataTrxId}`]: moveFileResult.metaDataTrxReward
			}
		});
	}

	public async movePrivateFile({ fileId, newParentFolderId, driveKey }: MovePrivateFileParams): Promise<ArFSResult> {
		const destFolderDriveId = await this.arFsDao.getDriveIdForFolderId(newParentFolderId);

		const owner = await this.getOwnerForDriveId(destFolderDriveId);
		await this.assertOwnerAddress(owner);

		const originalFileMetaData = await this.getPrivateFile({ fileId, driveKey });

		if (!destFolderDriveId.equals(originalFileMetaData.driveId)) {
			throw new Error(errorMessage.cannotMoveToDifferentDrive);
		}

		if (originalFileMetaData.parentFolderId.equals(newParentFolderId)) {
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
				[`${moveFileResult.metaDataTrxId}`]: moveFileResult.metaDataTrxReward
			}
		});
	}

	public async movePublicFolder({ folderId, newParentFolderId }: MovePublicFolderParams): Promise<ArFSResult> {
		if (folderId.equals(newParentFolderId)) {
			throw new Error(errorMessage.folderCannotMoveIntoItself);
		}

		const destFolderDriveId = await this.arFsDao.getDriveIdForFolderId(newParentFolderId);

		const owner = await this.getOwnerForDriveId(destFolderDriveId);
		await this.assertOwnerAddress(owner);

		const originalFolderMetaData = await this.getPublicFolder({ folderId });

		if (!destFolderDriveId.equals(originalFolderMetaData.driveId)) {
			throw new Error(errorMessage.cannotMoveToDifferentDrive);
		}

		if (originalFolderMetaData.parentFolderId.equals(newParentFolderId)) {
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
			driveId: destFolderDriveId,
			owner
		});

		if (childrenFolderIds.some((fid) => fid.equals(newParentFolderId))) {
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
				[`${moveFolderResult.metaDataTrxId}`]: moveFolderResult.metaDataTrxReward
			}
		});
	}

	public async movePrivateFolder({
		folderId,
		newParentFolderId,
		driveKey
	}: MovePrivateFolderParams): Promise<ArFSResult> {
		if (folderId.equals(newParentFolderId)) {
			throw new Error(errorMessage.folderCannotMoveIntoItself);
		}

		const destFolderDriveId = await this.arFsDao.getDriveIdForFolderId(newParentFolderId);

		const owner = await this.getOwnerForDriveId(destFolderDriveId);
		await this.assertOwnerAddress(owner);

		const originalFolderMetaData = await this.getPrivateFolder({ folderId, driveKey });

		if (!destFolderDriveId.equals(originalFolderMetaData.driveId)) {
			throw new Error(errorMessage.cannotMoveToDifferentDrive);
		}

		if (originalFolderMetaData.parentFolderId.equals(newParentFolderId)) {
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
			driveKey,
			owner
		});

		if (childrenFolderIds.some((fid) => fid.equals(newParentFolderId))) {
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
				[`${moveFolderResult.metaDataTrxId}`]: moveFolderResult.metaDataTrxReward
			}
		});
	}

	public async uploadPublicFile({
		parentFolderId,
		wrappedFile,
		destinationFileName,
		conflictResolution = upsertOnConflicts
	}: UploadPublicFileParams): Promise<ArFSResult> {
		const driveId = await this.arFsDao.getDriveIdForFolderId(parentFolderId);

		const owner = await this.getOwnerForDriveId(driveId);
		await this.assertOwnerAddress(owner);

		// Derive destination name and names already within provided destination folder
		const destFileName = destinationFileName ?? wrappedFile.getBaseFileName();
		const filesAndFolderNames = await this.arFsDao.getPublicNameConflictInfoInFolder(parentFolderId);

		// Files cannot overwrite folder names
		if (filesAndFolderNames.folders.find((f) => f.folderName === destFileName)) {
			if (conflictResolution === skipOnConflicts) {
				// Return empty result if resolution set to skip on FILE to FOLDER name conflicts
				return emptyArFSResult;
			}

			// TODO: Add optional interactive prompt to resolve name conflicts in ticket PE-599
			throw new Error(errorMessage.entityNameExists);
		}

		const conflictingFileName = filesAndFolderNames.files.find((f) => f.fileName === destFileName);

		if (conflictingFileName) {
			if (conflictResolution === skipOnConflicts) {
				// File has the same name, skip the upload
				return emptyArFSResult;
			}

			if (
				conflictResolution === upsertOnConflicts &&
				conflictingFileName.lastModifiedDate.valueOf() === wrappedFile.lastModifiedDate.valueOf()
			) {
				// These files have the same name and last modified date, skip the upload
				return emptyArFSResult;
			}

			// TODO: Handle this.conflictResolution === 'ask' PE-639
		}

		// File is a new revision if destination name conflicts
		// with an existing file in the destination folder
		const existingFileId = conflictingFileName?.fileId;

		const uploadBaseCosts = await this.estimateAndAssertCostOfFileUpload(
			new ByteCount(wrappedFile.fileStats.size),
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

		const { tipData, reward: communityTipTrxReward } = await this.sendCommunityTip({
			communityWinstonTip: uploadBaseCosts.communityWinstonTip
		});

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
				[`${uploadFileResult.dataTrxId}`]: uploadFileResult.dataTrxReward,
				[`${uploadFileResult.metaDataTrxId}`]: uploadFileResult.metaDataTrxReward,
				[`${tipData.txId}`]: communityTipTrxReward
			}
		});
	}

	public async createPublicFolderAndUploadChildren({
		parentFolderId,
		wrappedFolder,
		destParentFolderName,
		conflictResolution = upsertOnConflicts
	}: BulkPublicUploadParams): Promise<ArFSResult> {
		const driveId = await this.arFsDao.getDriveIdForFolderId(parentFolderId);

		const owner = await this.getOwnerForDriveId(driveId);
		await this.assertOwnerAddress(owner);

		// Derive destination name and names already within provided destination folder
		const destFolderName = destParentFolderName ?? wrappedFolder.getBaseFileName();
		const filesAndFolderNames = await this.arFsDao.getPublicNameConflictInfoInFolder(parentFolderId);

		// Folders cannot overwrite file names
		if (filesAndFolderNames.files.find((f) => f.fileName === destFolderName)) {
			// TODO: Add optional interactive prompt to resolve name conflicts in ticket PE-599
			throw new Error(errorMessage.entityNameExists);
		}

		// Use existing folder id if the intended destination name
		// conflicts with an existing folder in the destination folder
		wrappedFolder.existingId = filesAndFolderNames.folders.find((f) => f.folderName === destFolderName)?.folderId;
		wrappedFolder.destinationName = destParentFolderName;

		// Check for conflicting names and assign existing IDs for later use
		await this.checkAndAssignExistingPublicNames(wrappedFolder);

		// Estimate and assert the cost of the entire bulk upload
		// This will assign the calculated base costs to each wrapped file and folder
		const bulkEstimation = await this.estimateAndAssertCostOfBulkUpload(wrappedFolder, conflictResolution);

		// TODO: Add interactive confirmation of price estimation before uploading

		const results = await this.recursivelyCreatePublicFolderAndUploadChildren({
			parentFolderId,
			wrappedFolder,
			driveId,
			owner: await this.wallet.getAddress(),
			conflictResolution
		});

		if (bulkEstimation.communityWinstonTip.isGreaterThan(W(0))) {
			// Send community tip only if communityWinstonTip has a value
			// This can be zero when a user uses this method to upload empty folders

			const { tipData, reward: communityTipTrxReward } = await this.sendCommunityTip({
				communityWinstonTip: bulkEstimation.communityWinstonTip
			});

			return Promise.resolve({
				created: results.entityResults,
				tips: [tipData],
				fees: { ...results.feeResults, [`${tipData.txId}`]: communityTipTrxReward }
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
		owner,
		conflictResolution
	}: RecursivePublicBulkUploadParams): Promise<{
		entityResults: ArFSEntityData[];
		feeResults: ArFSFees;
	}> {
		let uploadEntityFees: ArFSFees = {};
		let uploadEntityResults: ArFSEntityData[] = [];
		let folderId: FolderID;

		if (wrappedFolder.existingFileAtDestConflict) {
			// Folder names cannot conflict with file names
			// Return an empty result to continue other parts of upload
			return { entityResults: [], feeResults: {} };
		} else if (wrappedFolder.existingId) {
			// Re-use existing parent folder ID for bulk upload if it exists
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
			uploadEntityFees = { [`${metaDataTrxId}`]: metaDataTrxReward };
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
			if (
				// Conflict resolution is set to skip and there is an existing file
				(conflictResolution === skipOnConflicts && wrappedFile.existingId) ||
				// Conflict resolution is set to upsert and an existing file has the same last modified date
				(conflictResolution === upsertOnConflicts && wrappedFile.hasSameLastModifiedDate) ||
				// File names cannot conflict with folder names
				wrappedFile.existingFolderAtDestConflict
			) {
				// Continue loop, don't upload this file
				continue;
			}

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
				[`${uploadFileResult.dataTrxId}`]: uploadFileResult.dataTrxReward,
				[`${uploadFileResult.metaDataTrxId}`]: uploadFileResult.metaDataTrxReward
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
				owner,
				conflictResolution
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
		// TODO: Refactor to utils?
		if (+dataSize > Number.MAX_SAFE_INTEGER - 16) {
			throw new Error(`Max un-encrypted dataSize allowed is ${Number.MAX_SAFE_INTEGER - 16}!`);
		}
		return new ByteCount((+dataSize / 16 + 1) * 16);
	}

	public async uploadPrivateFile({
		parentFolderId,
		wrappedFile,
		driveKey,
		destinationFileName,
		conflictResolution = upsertOnConflicts
	}: UploadPrivateFileParams): Promise<ArFSResult> {
		const driveId = await this.arFsDao.getDriveIdForFolderId(parentFolderId);

		const owner = await this.getOwnerForDriveId(driveId);
		await this.assertOwnerAddress(owner);

		// Derive destination name and names already within provided destination folder
		const destFileName = destinationFileName ?? wrappedFile.getBaseFileName();
		const filesAndFolderNames = await this.arFsDao.getPrivateNameConflictInfoInFolder(parentFolderId, driveKey);

		// Files cannot overwrite folder names
		if (filesAndFolderNames.folders.find((f) => f.folderName === destFileName)) {
			if (conflictResolution === skipOnConflicts) {
				// Return empty result if resolution set to skip on FILE to FOLDER name conflicts
				return emptyArFSResult;
			}

			// TODO: Add optional interactive prompt to resolve name conflicts in ticket PE-599
			throw new Error(errorMessage.entityNameExists);
		}

		const conflictingFileName = filesAndFolderNames.files.find((f) => f.fileName === destFileName);

		if (conflictingFileName) {
			if (conflictResolution === skipOnConflicts) {
				// File has the same name, skip the upload
				return emptyArFSResult;
			}

			if (
				conflictResolution === upsertOnConflicts &&
				conflictingFileName.lastModifiedDate.valueOf() === wrappedFile.lastModifiedDate.valueOf()
			) {
				// These files have the same name and last modified date, skip the upload
				return emptyArFSResult;
			}

			// TODO: Handle this.conflictResolution === 'ask' PE-639
		}

		// File is a new revision if destination name conflicts
		// with an existing file in the destination folder
		const existingFileId = conflictingFileName?.fileId;

		const uploadBaseCosts = await this.estimateAndAssertCostOfFileUpload(
			new ByteCount(wrappedFile.fileStats.size),
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

		const { tipData, reward: communityTipTrxReward } = await this.sendCommunityTip({
			communityWinstonTip: uploadBaseCosts.communityWinstonTip
		});

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
				[`${uploadFileResult.dataTrxId}`]: uploadFileResult.dataTrxReward,
				[`${uploadFileResult.metaDataTrxId}`]: uploadFileResult.metaDataTrxReward,
				[`${tipData.txId}`]: communityTipTrxReward
			}
		});
	}

	public async createPrivateFolderAndUploadChildren({
		parentFolderId,
		wrappedFolder,
		driveKey,
		destParentFolderName,
		conflictResolution = upsertOnConflicts
	}: BulkPrivateUploadParams): Promise<ArFSResult> {
		// Retrieve drive ID from folder ID
		const driveId = await this.arFsDao.getDriveIdForFolderId(parentFolderId);

		// Get owner of drive, will error if no drives are found
		const owner = await this.getOwnerForDriveId(driveId);

		// Assert that the provided wallet is the owner of the drive
		await this.assertOwnerAddress(owner);

		// Derive destination name and names already within provided destination folder
		const destFolderName = destParentFolderName ?? wrappedFolder.getBaseFileName();
		const filesAndFolderNames = await this.arFsDao.getPrivateNameConflictInfoInFolder(parentFolderId, driveKey);

		// Folders cannot overwrite file names
		if (filesAndFolderNames.files.find((f) => f.fileName === destFolderName)) {
			// TODO: Add optional interactive prompt to resolve name conflicts in ticket PE-599
			throw new Error(errorMessage.entityNameExists);
		}

		// Use existing folder id if the intended destination name
		// conflicts with an existing folder in the destination folder
		wrappedFolder.existingId = filesAndFolderNames.folders.find((f) => f.folderName === destFolderName)?.folderId;
		wrappedFolder.destinationName = destParentFolderName;

		// Check for conflicting names and assign existing IDs for later use
		await this.checkAndAssignExistingPrivateNames(wrappedFolder, driveKey);

		// Estimate and assert the cost of the entire bulk upload
		// This will assign the calculated base costs to each wrapped file and folder
		const bulkEstimation = await this.estimateAndAssertCostOfBulkUpload(
			wrappedFolder,
			conflictResolution,
			driveKey
		);

		// TODO: Add interactive confirmation of price estimation before uploading

		const results = await this.recursivelyCreatePrivateFolderAndUploadChildren({
			parentFolderId,
			wrappedFolder,
			driveKey,
			driveId,
			owner,
			conflictResolution
		});

		if (bulkEstimation.communityWinstonTip.isGreaterThan(W(0))) {
			// Send community tip only if communityWinstonTip has a value
			// This can be zero when a user uses this method to upload empty folders

			const { tipData, reward: communityTipTrxReward } = await this.sendCommunityTip({
				communityWinstonTip: bulkEstimation.communityWinstonTip
			});

			return Promise.resolve({
				created: results.entityResults,
				tips: [tipData],
				fees: { ...results.feeResults, [`${tipData.txId}`]: communityTipTrxReward }
			});
		}

		return Promise.resolve({
			created: results.entityResults,
			tips: [],
			fees: results.feeResults
		});
	}

	protected async checkAndAssignExistingPublicNames(wrappedFolder: ArFSFolderToUpload): Promise<void> {
		await wrappedFolder.checkAndAssignExistingNames((parentFolderId) =>
			this.arFsDao.getPublicNameConflictInfoInFolder(parentFolderId)
		);
	}

	protected async checkAndAssignExistingPrivateNames(
		wrappedFolder: ArFSFolderToUpload,
		driveKey: DriveKey
	): Promise<void> {
		await wrappedFolder.checkAndAssignExistingNames((parentFolderId) =>
			this.arFsDao.getPrivateNameConflictInfoInFolder(parentFolderId, driveKey)
		);
	}

	protected async recursivelyCreatePrivateFolderAndUploadChildren({
		wrappedFolder,
		driveId,
		parentFolderId,
		driveKey,
		owner,
		conflictResolution
	}: RecursivePrivateBulkUploadParams): Promise<{
		entityResults: ArFSEntityData[];
		feeResults: ArFSFees;
	}> {
		let uploadEntityFees: ArFSFees = {};
		let uploadEntityResults: ArFSEntityData[] = [];
		let folderId: FolderID;

		if (wrappedFolder.existingFileAtDestConflict) {
			// Folder names cannot conflict with file names
			// Return an empty result to continue other parts of upload
			return { entityResults: [], feeResults: {} };
		} else if (wrappedFolder.existingId) {
			// Re-use existing parent folder ID for bulk upload if it exists
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
			uploadEntityFees = { [`${metaDataTrxId}`]: metaDataTrxReward };
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
			if (
				// Conflict resolution is set to skip and there is an existing file
				(conflictResolution === skipOnConflicts && wrappedFile.existingId) ||
				// Conflict resolution is set to upsert and an existing file has the same last modified date
				(conflictResolution === upsertOnConflicts && wrappedFile.hasSameLastModifiedDate) ||
				// File names cannot conflict with folder names
				wrappedFile.existingFolderAtDestConflict
			) {
				// Continue loop, don't upload this file
				continue;
			}

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
				[`${uploadFileResult.dataTrxId}`]: uploadFileResult.dataTrxReward,
				[`${uploadFileResult.metaDataTrxId}`]: uploadFileResult.metaDataTrxReward
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
				owner,
				conflictResolution
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

	public async createPublicFolder({
		folderName,
		driveId,
		parentFolderId
	}: CreatePublicFolderParams): Promise<ArFSResult> {
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
				[`${metaDataTrxId}`]: metaDataTrxReward
			}
		});
	}

	public async createPrivateFolder({
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
				[`${metaDataTrxId}`]: metaDataTrxReward
			}
		});
	}

	public async createPublicDrive({ driveName }: CreatePublicDriveParams): Promise<ArFSResult> {
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
				[`${createDriveResult.metaDataTrxId}`]: createDriveResult.metaDataTrxReward,
				[`${createDriveResult.rootFolderTrxId}`]: createDriveResult.rootFolderTrxReward
			}
		});
	}

	public async createPrivateDrive({ driveName, newPrivateDriveData }: CreatePrivateDriveParams): Promise<ArFSResult> {
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
				[`${createDriveResult.metaDataTrxId}`]: createDriveResult.metaDataTrxReward,
				[`${createDriveResult.rootFolderTrxId}`]: createDriveResult.rootFolderTrxReward
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
		conflictResolution: FileNameConflictResolution,
		driveKey?: DriveKey,
		isParentFolder = true
	): Promise<{ totalPrice: Winston; totalFilePrice: Winston; communityWinstonTip: Winston }> {
		let totalPrice = W(0);
		let totalFilePrice = W(0);

		if (folderToUpload.existingFileAtDestConflict) {
			// Return an empty estimation, folders CANNOT overwrite files
			return { totalPrice: W('0'), totalFilePrice: W('0'), communityWinstonTip: W('0') };
		}

		// Don't estimate cost of folder metadata if using existing folder
		if (!folderToUpload.existingId) {
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
			const parentFolderWinstonPrice = metaDataBaseReward;

			// Assign base costs to folder
			folderToUpload.baseCosts = { metaDataBaseReward: parentFolderWinstonPrice };

			totalPrice = totalPrice.plus(parentFolderWinstonPrice);
		}

		for await (const file of folderToUpload.files) {
			if (
				(conflictResolution === skipOnConflicts && file.existingId) ||
				(conflictResolution === upsertOnConflicts && file.hasSameLastModifiedDate) ||
				file.existingFolderAtDestConflict
			) {
				// File will skipped, don't estimate it; continue the loop
				continue;
			}

			const fileSize = driveKey ? file.encryptedDataSize() : new ByteCount(file.fileStats.size);

			const fileDataBaseReward = await this.priceEstimator.getBaseWinstonPriceForByteCount(fileSize);

			const stubFileMetaData = driveKey
				? await this.stubPrivateFileMetadata(file, file.getBaseFileName())
				: this.stubPublicFileMetadata(file, file.getBaseFileName());
			const metaDataBaseReward = await this.priceEstimator.getBaseWinstonPriceForByteCount(
				stubFileMetaData.sizeOf()
			);

			totalPrice = totalPrice.plus(fileDataBaseReward);
			totalPrice = totalPrice.plus(metaDataBaseReward);

			totalFilePrice = totalFilePrice.plus(fileDataBaseReward);

			// Assign base costs to the file
			file.baseCosts = {
				fileDataBaseReward: fileDataBaseReward,
				metaDataBaseReward: metaDataBaseReward
			};
		}

		for await (const folder of folderToUpload.folders) {
			const childFolderResults = await this.estimateAndAssertCostOfBulkUpload(
				folder,
				conflictResolution,
				driveKey,
				false
			);

			totalPrice = totalPrice.plus(childFolderResults.totalPrice);
			totalFilePrice = totalFilePrice.plus(childFolderResults.totalFilePrice);
		}

		const totalWinstonPrice = totalPrice;
		let communityWinstonTip = W(0);

		if (isParentFolder) {
			if (totalFilePrice.isGreaterThan(W(0))) {
				communityWinstonTip = await this.communityOracle.getCommunityWinstonTip(totalFilePrice);
			}

			// Check and assert balance of the total bulk upload if this folder is the parent folder
			const walletHasBalance = await this.walletDao.walletHasBalance(
				this.wallet,
				communityWinstonTip.plus(totalWinstonPrice)
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

		return {
			totalPrice,
			totalFilePrice,
			communityWinstonTip
		};
	}

	async assertOwnerAddress(owner: ArweaveAddress): Promise<void> {
		if (!owner.equals(await this.wallet.getAddress())) {
			throw new Error('Supplied wallet is not the owner of this drive!');
		}
	}

	public async getPrivateDrive({ driveId, driveKey, owner }: GetPrivateDriveParams): Promise<ArFSPrivateDrive> {
		if (!owner) {
			owner = await this.getOwnerForDriveId(driveId);
		}
		await this.assertOwnerAddress(owner);

		return this.arFsDao.getPrivateDrive(driveId, driveKey, owner);
	}

	public async getPrivateFolder({ folderId, driveKey, owner }: GetPrivateFolderParams): Promise<ArFSPrivateFolder> {
		if (!owner) {
			owner = await this.arFsDao.getDriveOwnerForFolderId(folderId);
		}
		await this.assertOwnerAddress(owner);

		return this.arFsDao.getPrivateFolder(folderId, driveKey, owner);
	}

	public async getPrivateFile({ fileId, driveKey, owner }: GetPrivateFileParams): Promise<ArFSPrivateFile> {
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
	public async listPrivateFolder({
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
		const fileMetaTransactionDataReward = await this.priceEstimator.getBaseWinstonPriceForByteCount(
			fileTransactionData.sizeOf()
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
		let fileSize = decryptedFileSize;
		if (drivePrivacy === 'private') {
			fileSize = this.encryptedDataSize(fileSize);
		}

		let totalPrice = W(0);
		let fileDataBaseReward = W(0);
		let communityWinstonTip = W(0);
		if (fileSize) {
			fileDataBaseReward = await this.priceEstimator.getBaseWinstonPriceForByteCount(fileSize);
			communityWinstonTip = await this.communityOracle.getCommunityWinstonTip(fileDataBaseReward);
			const tipReward = await this.priceEstimator.getBaseWinstonPriceForByteCount(new ByteCount(0));
			totalPrice = totalPrice.plus(fileDataBaseReward);
			totalPrice = totalPrice.plus(communityWinstonTip);
			totalPrice = totalPrice.plus(tipReward);
		}
		const metaDataBaseReward = await this.priceEstimator.getBaseWinstonPriceForByteCount(metaData.sizeOf());
		totalPrice = totalPrice.plus(metaDataBaseReward);

		const totalWinstonPrice = totalPrice;

		const walletHasBalance = await this.walletDao.walletHasBalance(this.wallet, totalWinstonPrice);

		if (!walletHasBalance) {
			const walletBalance = await this.walletDao.getWalletWinstonBalance(this.wallet);

			throw new Error(
				`Wallet balance of ${walletBalance} Winston is not enough (${totalWinstonPrice}) for data upload of size ${fileSize} bytes!`
			);
		}

		return {
			fileDataBaseReward: fileDataBaseReward,
			metaDataBaseReward: metaDataBaseReward,
			communityWinstonTip
		};
	}

	async estimateAndAssertCostOfFolderUpload(metaData: ArFSObjectTransactionData): Promise<MetaDataBaseCosts> {
		const metaDataBaseReward = await this.priceEstimator.getBaseWinstonPriceForByteCount(metaData.sizeOf());
		const totalWinstonPrice = metaDataBaseReward;

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
		let totalPrice = W(0);
		const driveMetaDataBaseReward = await this.priceEstimator.getBaseWinstonPriceForByteCount(
			driveMetaData.sizeOf()
		);
		totalPrice = totalPrice.plus(driveMetaDataBaseReward);
		const rootFolderMetaDataBaseReward = await this.priceEstimator.getBaseWinstonPriceForByteCount(
			rootFolderMetaData.sizeOf()
		);
		totalPrice = totalPrice.plus(rootFolderMetaDataBaseReward);

		const totalWinstonPrice = totalPrice;

		const walletHasBalance = await this.walletDao.walletHasBalance(this.wallet, totalWinstonPrice);

		if (!walletHasBalance) {
			const walletBalance = await this.walletDao.getWalletWinstonBalance(this.wallet);

			throw new Error(
				`Wallet balance of ${walletBalance} Winston is not enough (${totalPrice}) for drive creation!`
			);
		}

		return {
			driveMetaDataBaseReward,
			rootFolderMetaDataBaseReward
		};
	}

	public async getDriveIdForFileId(fileId: FileID): Promise<DriveID> {
		return this.arFsDao.getDriveIdForFileId(fileId);
	}

	public async getDriveIdForFolderId(folderId: FolderID): Promise<DriveID> {
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
				`${stubEntityID}`,
				JSON.stringify((this.wallet as JWKWallet).getPrivateKey())
			)
		);
	}

	async assertValidPassword(password: string): Promise<void> {
		await this.arFsDao.assertValidPassword(password);
	}

	/**
	 *
	 * @param folderId - the ID of the folder to be download
	 * @returns - the array of streams to write
	 */
	async downloadPrivateFolder(folderId: FolderID, maxDepth: number, path: string, driveKey: DriveKey): Promise<void> {
		const folderEntityDump = await this.listPrivateFolder({ folderId, maxDepth, includeRoot: true, driveKey });
		const rootFolder = folderEntityDump[0];
		const rootFolderPath = rootFolder.path;
		const basePath = rootFolderPath.replace(/\/[^/]+$/, '');
		const allFileTransactionIDs = folderEntityDump
			.filter((entity) => entity.entityType === 'file')
			.map((entity) => entity.dataTxId);
		const allCipherIVs = await this.arFsDao.getCipherIVOfPrivateTransactionIDs(allFileTransactionIDs);
		for (const entity of folderEntityDump) {
			const relativePath = entity.path.replace(new RegExp(`^${basePath}/`), '');
			const fullPath = joinPath(path, relativePath);
			if (entity.entityType === 'folder') {
				await mkdirPromise(fullPath);
			} else if (entity.entityType === 'file') {
				const cipherIVresult = allCipherIVs.find((queryResult) => queryResult.txId === entity.dataTxId);
				if (!cipherIVresult) {
					throw new Error(`The transaction data of the file with txID "${entity.txId}" has no cipher IV!`);
				}
				await this.downloadPrivateFile(entity.getEntity(), fullPath, driveKey, cipherIVresult.cipherIV);
			} else {
				throw new Error(`Unsupported entity type: ${entity.entityType}`);
			}
		}
	}

	async downloadPrivateFile(
		privateFile: ArFSPrivateFile,
		path: string,
		driveKey: DriveKey,
		cipherIV?: CipherIV
	): Promise<void> {
		const fileTxId = privateFile.dataTxId;
		const encryptedDataStream = await this.arFsDao.downloadFileData(fileTxId);
		const writeStream = createWriteStream(path);
		const fileKey = await deriveFileKey(`${privateFile.fileId}`, driveKey);
		if (!cipherIV) {
			// Only fetch the data if no CipherIV was provided
			cipherIV = await this.arFsDao.getPrivateTransactionCipherIV(fileTxId);
		}
		const decryptingStream = new StreamDecrypt(cipherIV, fileKey);
		return pipelinePromise(encryptedDataStream.pipe(decryptingStream), writeStream);
	}
}
