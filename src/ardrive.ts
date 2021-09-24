import { CommunityOracle } from './community/community_oracle';
import { GQLTagInterface, winstonToAr } from 'ardrive-core-js';
import * as fs from 'fs';
import { TransactionID, ArweaveAddress, Winston, DriveID, FolderID, Bytes, TipType, FileID } from './types';
import { WalletDAO, Wallet } from './wallet_new';
import { ArFSDAOType, ArFSDAOAnonymous, ArFSPublicDrive, ArFSDAO, ArFSPrivateDrive } from './arfsdao';
import { ARDataPriceRegressionEstimator } from './utils/ar_data_price_regression_estimator';
import { FsFolder, isFolder, FsFile } from './fsFile';
import { ARDataPriceEstimator } from './utils/ar_data_price_estimator';

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
		private readonly priceEstimator: ARDataPriceEstimator = new ARDataPriceRegressionEstimator(true)
	) {
		super(arFsDao);
	}

	// TODO: FS shouldn't be reading the files more than once and doesn't belong in this class
	getFileSize(filePath: string): Bytes {
		return fs.statSync(filePath).size;
	}

	async sendCommunityTip(communityWinstonTip: Winston): Promise<TipResult> {
		const tokenHolder: ArweaveAddress = await this.communityOracle.selectTokenHolder();

		const transferResult = await this.walletDao.sendARToAddress(
			winstonToAr(+communityWinstonTip),
			this.wallet,
			tokenHolder,
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
		wrappedEntity: FsFile | FsFolder,
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

		const winstonPrice = await this.priceEstimator.getBaseWinstonPriceForByteCount(totalBytes);
		const communityWinstonTip = await this.communityOracle.getCommunityWinstonTip(winstonPrice.toString());
		const totalWinstonPrice = (+winstonPrice + +communityWinstonTip).toString();

		if (!this.walletDao.walletHasBalance(this.wallet, totalWinstonPrice)) {
			throw new Error('Not enough AR for file upload..');
		}

		let uploadEntityResults: ArFSEntityData[] = [];
		let uploadEntityFees: ArFSFees = {};

		if (isFolder(wrappedEntity)) {
			const results = await this.createPublicFolderAndUploadChildren(wrappedEntity, driveId, parentFolderId);

			uploadEntityFees = results.feeResults;
			uploadEntityResults = results.entityResults;
		} else {
			const uploadFileResult = await this.arFsDao.uploadPublicFile(
				parentFolderId,
				wrappedEntity,
				driveId,
				winstonPrice.toString(),
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

		const { tipData, reward: communityTipTrxReward } = await this.sendCommunityTip(communityWinstonTip);

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

		// Create parent folder
		const { folderTrxId, folderTrxReward, folderId } = await this.arFsDao.createPublicFolder(
			wrappedFolder.getBaseFileName(),
			driveId,
			parentFolderId,
			false // Don't check for folders that don't exist yet
		);

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
			const winstonPrice = (
				await this.priceEstimator.getBaseWinstonPriceForByteCount(wrappedFile.fileStats.size)
			).toString();

			const uploadFileResult = await this.arFsDao.uploadPublicFile(folderId, wrappedFile, driveId, winstonPrice);

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

		const winstonPrice = await this.priceEstimator.getBaseWinstonPriceForByteCount(totalBytes);
		const communityWinstonTip = await this.communityOracle.getCommunityWinstonTip(winstonPrice.toString());
		const totalWinstonPrice = (+winstonPrice + +communityWinstonTip).toString();

		if (!this.walletDao.walletHasBalance(this.wallet, totalWinstonPrice)) {
			throw new Error('Not enough AR for file upload..');
		}

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
			const uploadFileResult = await this.arFsDao.uploadPrivateFile(
				parentFolderId,
				wrappedEntity,
				password,
				driveId,
				winstonPrice.toString(),
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
		const { tipData, reward: communityTipTrxReward } = await this.sendCommunityTip(communityWinstonTip);

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
			const winstonPrice = (
				await this.priceEstimator.getBaseWinstonPriceForByteCount(wrappedFile.fileStats.size)
			).toString();

			const uploadFileResult = await this.arFsDao.uploadPrivateFile(
				folderId,
				wrappedFile,
				drivePassword,
				driveId,
				winstonPrice
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
					key: uploadFileResult.fileKey.toString('hex')
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

	async createPublicFolder(folderName: string, driveId: DriveID, parentFolderId?: FolderID): Promise<ArFSResult> {
		// Create the folder and retrieve its folder ID
		const { folderTrxId, folderTrxReward, folderId } = await this.arFsDao.createPublicFolder(
			folderName,
			driveId,
			parentFolderId
		);

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

		// IN THE FUTURE WE'LL SEND A COMMUNITY TIP HERE
		return Promise.resolve({
			created: [
				{
					type: 'folder',
					metadataTxId: folderTrxId,
					entityId: folderId,
					key: driveKey.toString('hex')
				}
			],
			tips: [],
			fees: {
				[folderTrxId]: +folderTrxReward
			}
		});
	}

	async createPublicDrive(driveName: string): Promise<ArFSResult> {
		const createDriveResult = await this.arFsDao.createPublicDrive(driveName);
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
		// Generate a new drive ID
		const createDriveResult = await this.arFsDao.createPrivateDrive(driveName, password);

		// IN THE FUTURE WE'LL SEND A COMMUNITY TIP HERE
		return Promise.resolve({
			created: [
				{
					type: 'drive',
					metadataTxId: createDriveResult.driveTrxId,
					entityId: createDriveResult.driveId,
					key: createDriveResult.driveKey.toString('hex')
				},
				{
					type: 'folder',
					metadataTxId: createDriveResult.rootFolderTrxId,
					entityId: createDriveResult.rootFolderId,
					key: createDriveResult.driveKey.toString('hex')
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
}
