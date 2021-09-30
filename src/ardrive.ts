import { CommunityOracle } from './community/community_oracle';
import { DrivePrivacy, GQLTagInterface, winstonToAr } from 'ardrive-core-js';
import { TransactionID, ArweaveAddress, Winston, DriveID, FolderID, TipType, FileID, FeeMultiple } from './types';
import { ArFSDAOType, ArFSDAOAnonymous, ArFSPublicDrive, ArFSDAO, ArFSPrivateDrive } from './arfsdao';
import { WalletDAO, Wallet, JWKWallet } from './wallet_new';
import { ARDataPriceRegressionEstimator } from './utils/ar_data_price_regression_estimator';
import { FsFolder, FsFile } from './fsFile';
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

export interface BulkFileBaseCosts extends FolderUploadBaseCosts {
	fileDataBaseReward: Winston;
}
export interface FileUploadBaseCosts extends BulkFileBaseCosts {
	communityWinstonTip: Winston;
}

export interface DriveUploadBaseCosts {
	driveMetaDataBaseReward: Winston;
	rootFolderMetaDataBaseReward: Winston;
}

const stubTransactionID = '0000000000000000000000000000000000000000000';
const stubEntityID = '00000000-0000-0000-0000-000000000000';

interface RecursiveBulkUploadParams {
	parentFolderId: FolderID;
	wrappedFolder: FsFolder;
	driveId: DriveID;
}

interface RecursivePublicBulkUploadParams extends RecursiveBulkUploadParams {
	folderData: ArFSPublicFolderTransactionData;
}

interface RecursivePrivateBulkUploadParams extends RecursiveBulkUploadParams {
	drivePassword: string;
	folderData: ArFSPrivateFolderTransactionData;
}
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
		wrappedFile: FsFile,
		destinationFileName?: string
	): Promise<ArFSResult> {
		// Retrieve drive ID from folder ID and ensure that it is indeed public
		const driveId = await this.arFsDao.getDriveIdForFolderId(parentFolderId);
		const drive = await this.arFsDao.getPublicDrive(driveId);
		if (!drive) {
			throw new Error(`Public drive with Drive ID ${driveId} not found!`);
		}

		const uploadBaseCosts = await this.estimateAndAssertCostOfFileUpload(
			wrappedFile.fileStats.size,
			this.stubPublicFileMetadata(wrappedFile, destinationFileName),
			'public'
		);
		const fileDataRewardSettings = { reward: uploadBaseCosts.fileDataBaseReward, feeMultiple: this.feeMultiple };
		const metadataRewardSettings = { reward: uploadBaseCosts.metaDataBaseReward, feeMultiple: this.feeMultiple };

		const uploadFileResult = await this.arFsDao.uploadPublicFile(
			parentFolderId,
			wrappedFile,
			driveId,
			fileDataRewardSettings,
			metadataRewardSettings,
			destinationFileName
		);

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
		wrappedFolder: FsFolder,
		parentFolderName?: string
	): Promise<ArFSResult> {
		// Retrieve drive ID from folder ID and ensure that it is indeed public
		const driveId = await this.arFsDao.getDriveIdForFolderId(parentFolderId);
		const drive = await this.arFsDao.getPublicDrive(driveId);
		if (!drive) {
			throw new Error(`Public drive with Drive ID ${driveId} not found!`);
		}

		const parentFolderData = new ArFSPublicFolderTransactionData(
			parentFolderName ?? wrappedFolder.getBaseFileName()
		);

		// Estimate and assert the cost of the entire bulk upload
		// This will assign the calculated base costs to each wrapped file and folder
		const bulkEstimation = await this.estimateAndAssertCostOfBulkUpload(wrappedFolder, 'public', parentFolderData);

		// TODO: Add interactive confirmation of price estimation before uploading

		const results = await this.recursivelyCreatePublicFolderAndUploadChildren({
			parentFolderId,
			wrappedFolder,
			folderData: parentFolderData,
			driveId
		});

		const { tipData, reward: communityTipTrxReward } = await this.sendCommunityTip(
			bulkEstimation.communityWinstonTip
		);

		return Promise.resolve({
			created: results.entityResults,
			tips: [tipData],
			fees: { ...results.feeResults, [tipData.txId]: +communityTipTrxReward }
		});
	}

	protected async recursivelyCreatePublicFolderAndUploadChildren({
		parentFolderId,
		wrappedFolder,
		driveId,
		folderData
	}: RecursivePublicBulkUploadParams): Promise<{
		entityResults: ArFSEntityData[];
		feeResults: ArFSFees;
	}> {
		let uploadEntityResults: ArFSEntityData[] = [];
		let uploadEntityFees: ArFSFees = {};

		// Create the parent folder
		const { folderTrxId, folderTrxReward, folderId } = await this.arFsDao.createPublicFolder({
			folderData: folderData,
			driveId,
			rewardSettings: {
				reward: wrappedFolder.getBaseCosts().metaDataBaseReward,
				feeMultiple: this.feeMultiple
			},
			parentFolderId,
			syncParentFolderId: false
		});

		// Capture parent folder results
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
			const fileDataRewardSettings = {
				reward: wrappedFile.getBaseCosts().fileDataBaseReward,
				feeMultiple: this.feeMultiple
			};

			const metadataRewardSettings = {
				reward: wrappedFile.getBaseCosts().metaDataBaseReward,
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
			const folderData = new ArFSPublicFolderTransactionData(childFolder.getBaseFileName());

			// Recursion alert, will keep creating folders of all nested folders
			const results = await this.recursivelyCreatePublicFolderAndUploadChildren({
				parentFolderId: folderId,
				wrappedFolder: childFolder,
				driveId,
				folderData
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
	encryptedDataSize(dataSize: number): number {
		return (dataSize / 16 + 1) * 16;
	}

	async uploadPrivateFile(
		parentFolderId: FolderID,
		wrappedFile: FsFile,
		password: string,
		destinationFileName?: string
	): Promise<ArFSResult> {
		// Retrieve drive ID from folder ID and ensure that it is indeed a private drive
		const driveId = await this.arFsDao.getDriveIdForFolderId(parentFolderId);
		const drive = await this.arFsDao.getPrivateDrive(driveId, password);
		if (!drive) {
			throw new Error(`Private drive with Drive ID ${driveId} not found!`);
		}

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

		const uploadFileResult = await this.arFsDao.uploadPrivateFile(
			parentFolderId,
			wrappedFile,
			driveId,
			password,
			fileDataRewardSettings,
			metadataRewardSettings,
			destinationFileName
		);

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
		wrappedFolder: FsFolder,
		drivePassword: string,
		parentFolderName?: string
	): Promise<ArFSResult> {
		// Retrieve drive ID from folder ID and ensure that it is indeed private
		const driveId = await this.arFsDao.getDriveIdForFolderId(parentFolderId);
		const drive = await this.arFsDao.getPrivateDrive(driveId, drivePassword);
		if (!drive) {
			throw new Error(`Private drive with Drive ID ${driveId} not found!`);
		}

		const wallet = this.wallet as JWKWallet;

		const parentFolderData = await ArFSPrivateFolderTransactionData.from(
			parentFolderName ?? wrappedFolder.getBaseFileName(),
			driveId,
			drivePassword,
			wallet.getPrivateKey()
		);

		// Estimate and assert the cost of the entire bulk upload
		// This will assign the calculated base costs to each wrapped file and folder
		const bulkEstimation = await this.estimateAndAssertCostOfBulkUpload(wrappedFolder, 'private', parentFolderData);

		// TODO: Add interactive confirmation of price estimation before uploading

		const results = await this.recursivelyCreatePrivateFolderAndUploadChildren({
			parentFolderId,
			wrappedFolder,
			folderData: parentFolderData,
			drivePassword,
			driveId
		});

		const { tipData, reward: communityTipTrxReward } = await this.sendCommunityTip(
			bulkEstimation.communityWinstonTip
		);

		return Promise.resolve({
			created: results.entityResults,
			tips: [tipData],
			fees: { ...results.feeResults, [tipData.txId]: +communityTipTrxReward }
		});
	}

	protected async recursivelyCreatePrivateFolderAndUploadChildren({
		wrappedFolder,
		driveId,
		parentFolderId,
		drivePassword,
		folderData
	}: RecursivePrivateBulkUploadParams): Promise<{
		entityResults: ArFSEntityData[];
		feeResults: ArFSFees;
	}> {
		let uploadEntityResults: ArFSEntityData[] = [];
		let uploadEntityFees: ArFSFees = {};

		// Create parent folder
		const { folderTrxId, folderTrxReward, folderId, driveKey } = await this.arFsDao.createPrivateFolder({
			folderData: folderData,
			driveId,
			rewardSettings: {
				reward: wrappedFolder.getBaseCosts().metaDataBaseReward,
				feeMultiple: this.feeMultiple
			},
			parentFolderId,
			drivePassword,
			syncParentFolderId: false
		});

		// Capture parent folder results
		uploadEntityFees = { ...uploadEntityFees, [folderTrxId]: +folderTrxReward };
		uploadEntityResults = [
			...uploadEntityResults,
			{
				type: 'folder',
				metadataTxId: folderTrxId,
				entityId: folderId,
				key: urlEncodeHashKey(driveKey)
			}
		];

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
			const folderData = await ArFSPrivateFolderTransactionData.from(
				wrappedFolder.getBaseFileName(),
				driveId,
				drivePassword,
				(this.wallet as JWKWallet).getPrivateKey()
			);

			// Recursion alert, will keep creating folders of all nested folders
			const results = await this.recursivelyCreatePrivateFolderAndUploadChildren({
				parentFolderId: folderId,
				wrappedFolder: childFolder,
				driveId,
				drivePassword,
				folderData
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

		// IN THE FUTURE WE MIGHT SEND A COMMUNITY TIP HERE
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
		// Assert that there's enough AR available in the wallet
		const folderData = await ArFSPrivateFolderTransactionData.from(
			folderName,
			driveId,
			drivePassword,
			(this.wallet as JWKWallet).getPrivateKey()
		);

		const { metaDataBaseReward } = await this.estimateAndAssertCostOfFolderUpload(folderData);

		// Create the folder and retrieve its folder ID
		const { folderTrxId, folderTrxReward, folderId, driveKey } = await this.arFsDao.createPrivateFolder({
			folderData,
			driveId,
			rewardSettings: { reward: metaDataBaseReward, feeMultiple: this.feeMultiple },
			drivePassword,
			parentFolderId
		});

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

	async estimateAndAssertCostOfBulkUpload(
		folderToUpload: FsFolder,
		drivePrivacy: DrivePrivacy,
		parentFolderMetaData?: ArFSObjectTransactionData
	): Promise<{ totalPrice: Winston; communityWinstonTip: Winston }> {
		// parentFolderMetaData will only exist if this folder is the parent folder
		// Recursing children folders will not have meta data assigned
		const isParentFolder: boolean = parentFolderMetaData !== undefined;

		const metaDataBaseReward = await this.priceEstimator.getBaseWinstonPriceForByteCount(
			(parentFolderMetaData ?? new ArFSPublicFolderTransactionData(folderToUpload.getBaseFileName())).sizeOf()
		);
		const parentFolderWinstonPrice = metaDataBaseReward.toString();

		// Assign base costs to folder
		folderToUpload.baseCosts = { metaDataBaseReward: parentFolderWinstonPrice };

		let totalPrice = +parentFolderWinstonPrice;
		let totalFileDataRewards = 0;

		for await (const file of folderToUpload.files) {
			const fileSize = drivePrivacy === 'private' ? file.encryptedDataSize() : file.fileStats.size;

			const fileDataBaseReward = await this.priceEstimator.getBaseWinstonPriceForByteCount(fileSize);

			const stubFileMetaData = this.stubPublicFileMetadata(file, file.getBaseFileName());
			const metaDataBaseReward = await this.priceEstimator.getBaseWinstonPriceForByteCount(
				stubFileMetaData.sizeOf()
			);

			totalPrice += fileDataBaseReward;
			totalPrice += metaDataBaseReward;

			totalFileDataRewards += fileDataBaseReward;

			// Assign base costs to the file
			file.baseCosts = {
				fileDataBaseReward: fileDataBaseReward.toString(),
				metaDataBaseReward: metaDataBaseReward.toString()
			};
		}

		for await (const folder of folderToUpload.folders) {
			const childFolderResults = await this.estimateAndAssertCostOfBulkUpload(folder, drivePrivacy);

			totalPrice += +childFolderResults.totalPrice;
		}

		const totalWinstonPrice = totalPrice.toString();
		let communityWinstonTip = '0';

		if (isParentFolder) {
			communityWinstonTip = await this.communityOracle.getCommunityWinstonTip(String(totalFileDataRewards));

			// Check and assert balance of the total bulk upload if this folder is the parent folder
			const walletHasBalance = await this.walletDao.walletHasBalance(
				this.wallet,
				String(+communityWinstonTip + +totalWinstonPrice)
			);

			if (!walletHasBalance) {
				const walletBalance = await this.walletDao.getWalletWinstonBalance(this.wallet);

				throw new Error(
					`Wallet balance of ${walletBalance} Winston is not enough (${totalWinstonPrice}) for data upload of size ${folderToUpload.getTotalBytes(
						drivePrivacy === 'private'
					)} bytes!`
				);
			}
		}

		return { totalPrice: String(totalPrice), communityWinstonTip };
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

	async estimateAndAssertCostOfFolderUpload(metaData: ArFSObjectTransactionData): Promise<FolderUploadBaseCosts> {
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

	// Provides for stubbing metadata during cost estimations since the data trx ID won't yet be known
	private stubPublicFileMetadata(
		wrappedFile: FsFile,
		destinationFileName?: string
	): ArFSPublicFileMetadataTransactionData {
		const fileStats = wrappedFile.fileStats;
		const dataContentType = wrappedFile.getContentType();
		const lastModifiedDateMS = Math.floor(fileStats.mtimeMs);

		return new ArFSPublicFileMetadataTransactionData(
			destinationFileName ?? wrappedFile.getBaseFileName(),
			fileStats.size,
			lastModifiedDateMS,
			stubTransactionID,
			dataContentType
		);
	}

	// Provides for stubbing metadata during cost estimations since the data trx and File IDs won't yet be known
	private async stubPrivateFileMetadata(
		wrappedFile: FsFile,
		destinationFileName?: string
	): Promise<ArFSPrivateFileMetadataTransactionData> {
		const fileStats = wrappedFile.fileStats;
		const dataContentType = wrappedFile.getContentType();
		const lastModifiedDateMS = Math.floor(fileStats.mtimeMs);

		return await ArFSPrivateFileMetadataTransactionData.from(
			destinationFileName ?? wrappedFile.getBaseFileName(),
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
