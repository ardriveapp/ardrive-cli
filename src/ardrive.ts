import { CommunityOracle } from './community/community_oracle';
import { DrivePrivacy, extToMime, GQLTagInterface, winstonToAr } from 'ardrive-core-js';
import * as fs from 'fs';
import {
	TransactionID,
	ArweaveAddress,
	Winston,
	DriveID,
	FolderID,
	Bytes,
	TipType,
	FileID,
	FeeMultiple
} from './types';
import { ArFSDAOType, ArFSDAOAnonymous, ArFSPublicDrive, ArFSDAO, ArFSPrivateDrive } from './arfsdao';
import { WalletDAO, Wallet, JWKWallet } from './wallet_new';
import { ARDataPriceRegressionEstimator } from './utils/ar_data_price_regression_estimator';
import { FsFolder, isFolder, FsFile } from './fsFile';
import { ARDataPriceEstimator } from './utils/ar_data_price_estimator';
import {
	ArFSDriveTransactionData,
	ArFSFolderTransactionData,
	ArFSObjectTransactionData,
	ArFSPrivateDriveTransactionData,
	ArFSPrivateFileMetadataTransactionData,
	ArFSPrivateFolderTransactionData,
	ArFSPublicDriveTransactionData,
	ArFSPublicFileMetadataTransactionData,
	ArFSPublicFolderTransactionData
} from './arfs_trx_data_types';
import { basename } from 'path';
import { urlEncodeHashKey } from './utils';

export type ArFSEntityDataType = 'drive' | 'folder' | 'file';

export interface ArFSEntityData {
	type: ArFSEntityDataType;
	metadataTxId: TransactionID;
	dataTxId?: TransactionID;
	entityId: FolderID | DriveID | FileID;
	key?: string;
}

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

export interface FolderUploadBaseCosts {
	metaDataBaseReward: Winston;
}

export interface FileUploadBaseCosts extends FolderUploadBaseCosts {
	fileDataBaseReward: Winston;
	communityWinstonTip: Winston;
}

export interface DriveUploadBaseCosts {
	driveMetaDataBaseReward: Winston;
	rootFolderMetaDataBaseReward: Winston;
}

const stubTransactionID = '0000000000000000000000000000000000000000000';
const stubEntityID = '00000000-0000-0000-0000-000000000000';

export abstract class ArDriveType {
	protected abstract readonly arFsDao: ArFSDAOType;
}

export class ArDriveAnonymous extends ArDriveType {
	constructor(protected readonly arFsDao: ArFSDAOAnonymous) {
		super();
	}

	async getPublicDrive(driveId: DriveID): Promise<ArFSPublicDrive> {
		const driveEntity = await this.arFsDao.getPublicDrive(driveId);
		return Promise.resolve(driveEntity);
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

	// TODO: FS shouldn't be reading the files more than once and doesn't belong in this class
	getFileSize(filePath: string): Bytes {
		return fs.statSync(filePath).size;
	}

	// NOTE: Presumes that there's a sufficient wallet balance
	async sendCommunityTip(communityWinstonTip: Winston): Promise<TipResult> {
		const tokenHolder: ArweaveAddress = await this.communityOracle.selectTokenHolder();
		const arTransferBaseFee = await this.priceEstimator.getBaseWinstonPriceForByteCount(0);

		const transferResult = await this.walletDao.sendARToAddress(
			winstonToAr(+communityWinstonTip),
			this.wallet,
			tokenHolder,
			{ reward: arTransferBaseFee.toString(), feeMultiple: this.feeMultiple },
			this.dryRun,
			this.getTipTags()
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

	async uploadPublicFile(
		parentFolderId: FolderID,
		wrappedEntity: FsFile,
		destinationFileName?: string
	): Promise<ArFSResult> {
		// Retrieve drive ID from folder ID and ensure that it is indeed public
		const driveId = await this.arFsDao.getDriveIdForFolderId(parentFolderId);
		const drive = await this.arFsDao.getPublicDrive(driveId);
		if (!drive) {
			throw new Error(`Public drive with Drive ID ${driveId} not found!`);
		}

		/** Total bytes of all Files that are part of an upload */
		const totalBytes: Bytes = isFolder(wrappedEntity)
			? wrappedEntity.getTotalBytes()
			: wrappedEntity.fileStats.size;

		console.log(totalBytes, 'IMPLEMENT BULK BYTES');

		// const winstonPrice = await this.priceEstimator.getBaseWinstonPriceForByteCount(totalBytes);
		// const communityWinstonTip = await this.communityOracle.getCommunityWinstonTip(winstonPrice.toString());
		// const totalWinstonPrice = (+winstonPrice + +communityWinstonTip).toString();

		// if (!this.walletDao.walletHasBalance(this.wallet, totalWinstonPrice)) {
		// throw new Error('Not enough AR for file upload..');
		// }

		// TODO: Hoist this elsewhere for bulk uploads
		// const { winstonPrice, communityWinstonTip } = await this.estimateAndAssertCostOfUploadSize(
		// 	this.getFileSize(wrappedEntity.filePath),
		// 	'public'
		// );

		const uploadBaseCosts = await this.estimateAndAssertCostOfFileUpload(
			this.getFileSize(wrappedEntity.filePath),
			this.stubPublicFileMetadata(wrappedEntity.filePath, destinationFileName),
			'public'
		);
		const fileDataRewardSettings = { reward: uploadBaseCosts.fileDataBaseReward, feeMultiple: this.feeMultiple };
		const metadataRewardSettings = { reward: uploadBaseCosts.metaDataBaseReward, feeMultiple: this.feeMultiple };

		let uploadEntityResults: ArFSEntityData[] = [];
		let uploadEntityFees: ArFSFees = {};

		if (isFolder(wrappedEntity)) {
			const results = await this.createPublicFolderAndUploadChildren(wrappedEntity, driveId, parentFolderId);

			// TODO: Add interactive confirmation of AR price estimation

			// const { tipData, reward: communityTipTrxReward } = await this.sendCommunityTip(
			// 	uploadBaseCosts.communityWinstonTip
			// );

			uploadEntityFees = results.feeResults;
			uploadEntityResults = results.entityResults;
		} else {
			const uploadFileResult = await this.arFsDao.uploadPublicFile(
				parentFolderId,
				wrappedEntity,
				driveId,
				fileDataRewardSettings,
				metadataRewardSettings,
				destinationFileName
			);

			uploadEntityFees = {
				[uploadFileResult.dataTrxId]: +uploadFileResult.dataTrxReward,
				[uploadFileResult.metaDataTrxId]: +uploadFileResult.metaDataTrxReward
			};
			uploadEntityResults = [
				{
					type: 'file',
					metadataTxId: uploadFileResult.metaDataTrxId,
					dataTxId: uploadFileResult.dataTrxId,
					entityId: uploadFileResult.fileId
				}
			];
		}

		const { tipData, reward: communityTipTrxReward } = await this.sendCommunityTip(
			uploadBaseCosts.communityWinstonTip
		);

		return Promise.resolve({
			created: uploadEntityResults,
			tips: [tipData],
			fees: { ...uploadEntityFees, [tipData.txId]: +communityTipTrxReward }
		});
	}

	async createPublicFolderAndUploadChildren(
		wrappedFolder: FsFolder,
		driveId: DriveID,
		parentFolderId: FolderID
	): Promise<{
		entityResults: ArFSEntityData[];
		feeResults: ArFSFees;
	}> {
		let uploadEntityResults: ArFSEntityData[] = [];
		let uploadEntityFees: ArFSFees = {};

		// Assert that there's enough AR available in the wallet
		const folderData = new ArFSPublicFolderTransactionData(wrappedFolder.getBaseFileName());
		const { metaDataBaseReward } = await this.estimateAndAssertCostOfFolderUpload(folderData);

		// Create the parent folder
		const { folderTrxId, folderTrxReward, folderId } = await this.arFsDao.createPublicFolder({
			folderData,
			driveId,
			rewardSettings: { reward: metaDataBaseReward, feeMultiple: this.feeMultiple },
			parentFolderId,
			syncParentFolderId: false
		});

		// // Create parent folder
		// const { folderTrxId, folderTrxReward, folderId } = await this.arFsDao.createPublicFolder(
		// 	wrappedFolder.getBaseFileName(),
		// 	driveId,
		// 	parentFolderId,
		// 	false // Don't check for folders that don't exist yet
		// );

		// Capture results
		uploadEntityFees = { ...uploadEntityFees, [folderTrxId]: +folderTrxReward };
		uploadEntityResults = [
			...uploadEntityResults,
			{
				type: 'folder',
				metadataTxId: folderTrxId,
				entityId: folderId
			}
		];

		// Upload all files in the folder
		for await (const wrappedFile of wrappedFolder.files) {
			// TODO: Lift and implement estimateAndAssertCostOfBulkUpload that will
			// assign the estimated rewards to each wrapped file/folder
			const uploadBaseCosts = await this.estimateAndAssertCostOfFileUpload(
				this.getFileSize(wrappedFile.filePath),
				this.stubPublicFileMetadata(wrappedFile.filePath, wrappedFile.getBaseFileName()),
				'public'
			);
			const fileDataRewardSettings = {
				reward: uploadBaseCosts.fileDataBaseReward,
				feeMultiple: this.feeMultiple
			};
			const metadataRewardSettings = {
				reward: uploadBaseCosts.metaDataBaseReward,
				feeMultiple: this.feeMultiple
			};

			const uploadFileResult = await this.arFsDao.uploadPublicFile(
				folderId,
				wrappedFile,
				driveId,
				fileDataRewardSettings,
				metadataRewardSettings
			);

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
			const results = await this.createPublicFolderAndUploadChildren(childFolder, driveId, folderId);

			// Capture all folder results
			uploadEntityFees = {
				...uploadEntityFees,
				...results.feeResults
			};
			uploadEntityResults = [...uploadEntityResults, ...results.entityResults];
		}

		return { entityResults: uploadEntityResults, feeResults: uploadEntityFees };
	}

	/** Computes the size of a private file encrypted with AES256-GCM */
	encryptedDataSize(dataSize: number): number {
		return (dataSize / 16 + 1) * 16;
	}

	async uploadPrivateFile(
		parentFolderId: FolderID,
		wrappedEntity: FsFile | FsFolder,
		password: string,
		destinationFileName?: string
	): Promise<ArFSResult> {
		// Retrieve drive ID from folder ID and ensure that it is indeed a private drive
		const driveId = await this.arFsDao.getDriveIdForFolderId(parentFolderId);
		const drive = await this.arFsDao.getPrivateDrive(driveId, password);
		if (!drive) {
			throw new Error(`Private drive with Drive ID ${driveId} not found!`);
		}

		/** Total bytes of all Files that are part of an upload */
		const totalBytes: Bytes = isFolder(wrappedEntity)
			? wrappedEntity.getTotalBytes(true)
			: wrappedEntity.fileStats.size;

		console.log(totalBytes, 'IMPLEMENT BULK BYTES');

		// TODO: Hoist this elsewhere for bulk uploads
		const uploadBaseCosts = await this.estimateAndAssertCostOfFileUpload(
			wrappedEntity.fileStats.size,
			await this.stubPrivateFileMetadata(wrappedEntity.filePath, destinationFileName),
			'private'
		);

		// TODO: Add interactive confirmation of AR price estimation

		let uploadEntityResults: ArFSEntityData[] = [];
		let uploadEntityFees: ArFSFees = {};

		if (isFolder(wrappedEntity)) {
			const results = await this.createPrivateFolderAndUploadChildren(
				wrappedEntity,
				driveId,
				parentFolderId,
				password
			);

			uploadEntityFees = results.feeResults;
			uploadEntityResults = results.entityResults;
		} else {
			const fileDataRewardSettings = {
				reward: uploadBaseCosts.fileDataBaseReward,
				feeMultiple: this.feeMultiple
			};
			const metadataRewardSettings = {
				reward: uploadBaseCosts.metaDataBaseReward,
				feeMultiple: this.feeMultiple
			};
			const uploadFileResult = await this.arFsDao.uploadPrivateFile(
				parentFolderId,
				wrappedEntity,
				driveId,
				password,
				fileDataRewardSettings,
				metadataRewardSettings,
				destinationFileName
			);

			uploadEntityFees = {
				[uploadFileResult.dataTrxId]: +uploadFileResult.dataTrxReward,
				[uploadFileResult.metaDataTrxId]: +uploadFileResult.metaDataTrxReward
			};
			uploadEntityResults = [
				{
					type: 'file',
					metadataTxId: uploadFileResult.metaDataTrxId,
					dataTxId: uploadFileResult.dataTrxId,
					entityId: uploadFileResult.fileId,
					key: uploadFileResult.fileKey.toString('hex')
				}
			];
		}

		const { tipData, reward: communityTipTrxReward } = await this.sendCommunityTip(
			uploadBaseCosts.communityWinstonTip
		);

		return Promise.resolve({
			created: uploadEntityResults,
			tips: [tipData],
			fees: { ...uploadEntityFees, [tipData.txId]: +communityTipTrxReward }
		});
	}

	async createPrivateFolderAndUploadChildren(
		wrappedFolder: FsFolder,
		driveId: DriveID,
		parentFolderId: FolderID,
		drivePassword: string
	): Promise<{
		entityResults: ArFSEntityData[];
		feeResults: ArFSFees;
	}> {
		let uploadEntityResults: ArFSEntityData[] = [];
		let uploadEntityFees: ArFSFees = {};

		// Create parent folder
		const { folderTrxId, folderTrxReward, folderId, driveKey } = await this.arFsDao.createPrivateFolder(
			wrappedFolder.getBaseFileName(),
			driveId,
			parentFolderId,
			drivePassword,
			false // Don't check for folders that don't exist yet
		);

		// Capture results
		uploadEntityFees = { ...uploadEntityFees, [folderTrxId]: +folderTrxReward };
		uploadEntityResults = [
			...uploadEntityResults,
			{
				type: 'folder',
				metadataTxId: folderTrxId,
				entityId: folderId,
				key: driveKey.toString('hex')
			}
		];

		// Upload all files in the folder
		for await (const wrappedFile of wrappedFolder.files) {
			// TODO: Lift and implement estimateAndAssertCostOfBulkUpload that will
			// assign the estimated rewards to each wrapped file/folder
			const uploadBaseCosts = await this.estimateAndAssertCostOfFileUpload(
				this.getFileSize(wrappedFile.filePath),
				this.stubPublicFileMetadata(wrappedFile.filePath, wrappedFile.getBaseFileName()),
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

			const uploadFileResult = await this.arFsDao.uploadPrivateFile(
				folderId,
				wrappedFile,
				driveId,
				drivePassword,
				fileDataRewardSettings,
				metadataRewardSettings
			);

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
			const results = await this.createPrivateFolderAndUploadChildren(
				childFolder,
				driveId,
				folderId,
				drivePassword
			);

			// Capture all folder results
			uploadEntityFees = {
				...uploadEntityFees,
				...results.feeResults
			};
			uploadEntityResults = [...uploadEntityResults, ...results.entityResults];
		}

		return { entityResults: uploadEntityResults, feeResults: uploadEntityFees };
	}

	async createPublicFolder(folderName: string, driveId: string, parentFolderId?: FolderID): Promise<ArFSResult> {
		// Assert that there's enough AR available in the wallet
		const folderData = new ArFSPublicFolderTransactionData(folderName);
		const { metaDataBaseReward } = await this.estimateAndAssertCostOfFolderUpload(folderData);

		// Create the folder and retrieve its folder ID
		const { folderTrxId, folderTrxReward, folderId } = await this.arFsDao.createPublicFolder({
			folderData,
			driveId,
			rewardSettings: { reward: metaDataBaseReward, feeMultiple: this.feeMultiple },
			parentFolderId
		});

		// IN THE FUTURE WE'LL SEND A COMMUNITY TIP HERE
		return Promise.resolve({
			created: [
				{
					type: 'folder',
					metadataTxId: folderTrxId,
					entityId: folderId
				}
			],
			tips: [],
			fees: {
				[folderTrxId]: +folderTrxReward
			}
		});
	}

	async createPrivateFolder(
		folderName: string,
		driveId: DriveID,
		drivePassword: string,
		parentFolderId?: FolderID
	): Promise<ArFSResult> {
		// Create the folder and retrieve its folder ID
		const { folderTrxId, folderTrxReward, folderId, driveKey } = await this.arFsDao.createPrivateFolder(
			folderName,
			driveId,
			drivePassword,
			parentFolderId
		);

		// IN THE FUTURE WE MIGHT SEND A COMMUNITY TIP HERE
		return Promise.resolve({
			created: [
				{
					type: 'folder',
					metadataTxId: folderTrxId,
					entityId: folderId,
					key: urlEncodeHashKey(driveKey)
				}
			],
			tips: [],
			fees: {
				[folderTrxId]: +folderTrxReward
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
			rootFolderRewardSettings
		);
		return Promise.resolve({
			created: [
				{
					type: 'drive',
					metadataTxId: createDriveResult.driveTrxId,
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
				[createDriveResult.driveTrxId]: +createDriveResult.driveTrxReward,
				[createDriveResult.rootFolderTrxId]: +createDriveResult.rootFolderTrxReward
			}
		});
	}

	async createPrivateDrive(driveName: string, password: string): Promise<ArFSResult> {
		// Assert that there's enough AR available in the wallet
		const wallet = this.wallet as JWKWallet;
		const privKey = wallet.getPrivateKey();
		const stubRootFolderData = await ArFSPrivateFolderTransactionData.from(
			driveName,
			stubEntityID,
			password,
			privKey
		);
		const stubDriveData = await ArFSPrivateDriveTransactionData.from(
			driveName,
			stubEntityID,
			stubEntityID,
			password,
			privKey
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
			password,
			driveRewardSettings,
			rootFolderRewardSettings
		);

		// IN THE FUTURE WE MIGHT SEND A COMMUNITY TIP HERE
		return Promise.resolve({
			created: [
				{
					type: 'drive',
					metadataTxId: createDriveResult.driveTrxId,
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
				[createDriveResult.driveTrxId]: +createDriveResult.driveTrxReward,
				[createDriveResult.rootFolderTrxId]: +createDriveResult.rootFolderTrxReward
			}
		});
	}

	async getPrivateDrive(driveId: DriveID, drivePassword: string): Promise<ArFSPrivateDrive> {
		const driveEntity = await this.arFsDao.getPrivateDrive(driveId, drivePassword);
		return Promise.resolve(driveEntity);
	}

	async estimateAndAssertCostOfFileUpload(
		decryptedFileSize: number,
		metaData: ArFSObjectTransactionData,
		drivePrivacy: DrivePrivacy
	): Promise<FileUploadBaseCosts> {
		if (decryptedFileSize < 0) {
			throw new Error('File size should be non-negative number!');
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

		const walletBalance = this.walletDao.getWalletWinstonBalance(this.wallet);
		if (!this.walletDao.walletHasBalance(this.wallet, totalWinstonPrice)) {
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

	async estimateAndAssertCostOfFolderUpload(metaData: ArFSObjectTransactionData): Promise<FolderUploadBaseCosts> {
		const metaDataBaseReward = await this.priceEstimator.getBaseWinstonPriceForByteCount(metaData.sizeOf());
		const totalWinstonPrice = metaDataBaseReward.toString();

		const walletBalance = this.walletDao.getWalletWinstonBalance(this.wallet);
		if (!this.walletDao.walletHasBalance(this.wallet, totalWinstonPrice)) {
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

		if (!this.walletDao.walletHasBalance(this.wallet, totalWinstonPrice)) {
			const walletBalance = this.walletDao.getWalletWinstonBalance(this.wallet);
			throw new Error(
				`Wallet balance of ${walletBalance} Winston is not enough (${totalPrice}) for drive creation!`
			);
		}

		return {
			driveMetaDataBaseReward: driveMetaDataBaseReward.toString(),
			rootFolderMetaDataBaseReward: rootFolderMetaDataBaseReward.toString()
		};
	}

	// Provides for stubbing metadata during cost estimations since the data trx ID won't yet be known
	private stubPublicFileMetadata(
		filePath: string,
		destinationFileName?: string
	): ArFSPublicFileMetadataTransactionData {
		const fileStats = fs.statSync(filePath);
		const dataContentType = extToMime(filePath);
		const lastModifiedDateMS = Math.floor(fileStats.mtimeMs);
		return new ArFSPublicFileMetadataTransactionData(
			destinationFileName ?? basename(filePath),
			fileStats.size,
			lastModifiedDateMS,
			stubTransactionID,
			dataContentType
		);
	}

	// Provides for stubbing metadata during cost estimations since the data trx and File IDs won't yet be known
	private async stubPrivateFileMetadata(
		filePath: string,
		destinationFileName?: string
	): Promise<ArFSPrivateFileMetadataTransactionData> {
		const fileStats = fs.statSync(filePath);
		const dataContentType = extToMime(filePath);
		const lastModifiedDateMS = Math.floor(fileStats.mtimeMs);
		return await ArFSPrivateFileMetadataTransactionData.from(
			destinationFileName ?? basename(filePath),
			fileStats.size,
			lastModifiedDateMS,
			stubTransactionID,
			dataContentType,
			stubEntityID,
			stubEntityID,
			'stubPassword',
			(this.wallet as JWKWallet).getPrivateKey()
		);
	}
}
