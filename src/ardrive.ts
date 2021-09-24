import { CommunityOracle } from './community/community_oracle';
import { GQLTagInterface, winstonToAr } from 'ardrive-core-js';
import * as fs from 'fs';
import {
	ArFSDAOType,
	ArFSDAOAnonymous,
	ArFSPublicDrive,
	ArFSDAO,
	ArFSPrivateDrive,
	ArFSPublicFolder,
	ArFSPrivateFolder,
	ArFSPublicFile,
	ArFSPrivateFile,
	ArFSFileOrFolderEntity
} from './arfsdao';
import { TransactionID, ArweaveAddress, Winston, DriveID, FolderID, Bytes, TipType } from './types';
import { WalletDAO, Wallet } from './wallet_new';
import { ARDataPriceRegressionEstimator } from './utils/ar_data_price_regression_estimator';
import { ARDataPriceEstimator } from './utils/ar_data_price_estimator';

export type ArFSEntityDataType = 'drive' | 'folder' | 'file';

export interface ArFSEntityData {
	type: ArFSEntityDataType;
	metadataTxId: TransactionID;
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

	async getPublicFolder(folderId: string): Promise<ArFSPublicFolder> {
		const folder = await this.arFsDao.getPublicFolder(folderId);
		return folder;
	}

	async getRootFolderIdOfPublicDrive(driveId: DriveID): Promise<FolderID> {
		const drive = await this.getPublicDrive(driveId);
		const rootFolderId = drive.rootFolderId;
		return rootFolderId;
	}

	async getChildrenTxIds(folderId: FolderID): Promise<string[]> {
		return this.arFsDao.getChildrenOfFolderTxIds(folderId);
	}

	async getAllFoldersOfPublicDrive(driveId: DriveID): Promise<ArFSFileOrFolderEntity[]> {
		return this.arFsDao.getAllFoldersOfPublicDrive(driveId);
	}

	async getPublicChildrenFilesFromFolderIDs(folderIDs: FolderID[]): Promise<ArFSPublicFile[]> {
		return this.arFsDao.getAllPublicChildrenFilesFromFolderIDs(folderIDs);
	}

	async getPublicEntityNameFromTxId(txId: string): Promise<string> {
		return (await this.arFsDao.getDataOfPublicEntityFromTxId(txId)).name;
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
		filePath: string,
		destinationFileName?: string
	): Promise<ArFSResult> {
		const winstonPrice = await this.priceEstimator.getBaseWinstonPriceForByteCount(this.getFileSize(filePath));
		const communityWinstonTip = await this.communityOracle.getCommunityWinstonTip(winstonPrice.toString());
		const totalWinstonPrice = (+winstonPrice + +communityWinstonTip).toString();

		if (!this.walletDao.walletHasBalance(this.wallet, totalWinstonPrice)) {
			throw new Error('Not enough AR for file upload..');
		}

		// TODO: Add interactive confirmation of AR price estimation

		const uploadFileResult = await this.arFsDao.uploadPublicFile(
			parentFolderId,
			filePath,
			winstonPrice.toString(),
			destinationFileName
		);
		const { tipData, reward: communityTipTrxReward } = await this.sendCommunityTip(communityWinstonTip);

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
				[uploadFileResult.metaDataTrxId]: +uploadFileResult.metaDataTrxReward,
				[uploadFileResult.dataTrxId]: +uploadFileResult.dataTrxReward,
				[tipData.txId]: +communityTipTrxReward
			}
		});
	}

	/** Estimates the size of a private file encrypted with a uuid */
	encryptedFileSize(filePath: string): number {
		// cipherLen = (clearLen/16 + 1) * 16;
		return (this.getFileSize(filePath) / 16 + 1) * 16;
	}

	async uploadPrivateFile(
		parentFolderId: FolderID,
		filePath: string,
		password: string,
		destinationFileName?: string
	): Promise<ArFSResult> {
		const winstonPrice = await this.priceEstimator.getBaseWinstonPriceForByteCount(
			this.encryptedFileSize(filePath)
		);
		const communityWinstonTip = await this.communityOracle.getCommunityWinstonTip(winstonPrice.toString());
		const totalWinstonPrice = (+winstonPrice + +communityWinstonTip).toString();

		if (!this.walletDao.walletHasBalance(this.wallet, totalWinstonPrice)) {
			throw new Error('Not enough AR for file upload..');
		}

		// TODO: Add interactive confirmation of AR price estimation

		const uploadFileResult = await this.arFsDao.uploadPrivateFile(
			parentFolderId,
			filePath,
			password,
			winstonPrice.toString(),
			destinationFileName
		);

		const { tipData, reward: communityTipTrxReward } = await this.sendCommunityTip(communityWinstonTip);

		return Promise.resolve({
			created: [
				{
					type: 'file',
					metadataTxId: uploadFileResult.metaDataTrxId,
					dataTxId: uploadFileResult.dataTrxId,
					entityId: uploadFileResult.fileId,
					key: uploadFileResult.fileKey.toString('hex')
				}
			],
			tips: [tipData],
			fees: {
				[uploadFileResult.metaDataTrxId]: +uploadFileResult.metaDataTrxReward,
				[uploadFileResult.dataTrxId]: +uploadFileResult.dataTrxReward,
				[tipData.txId]: +communityTipTrxReward
			}
		});
	}

	async createPublicFolder(folderName: string, driveId: string, parentFolderId?: FolderID): Promise<ArFSResult> {
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

	async getPrivateFolder(folderId: FolderID): Promise<ArFSPrivateFolder> {
		const folderEntity = await this.arFsDao.getPrivateFolder(folderId);
		return folderEntity;
	}

	async getAllFoldersOfPrivateDrive(driveId: DriveID): Promise<ArFSPrivateFolder[]> {
		return this.arFsDao.getAllFoldersOfPrivateDrive(driveId);
	}

	async getPrivateChildrenFilesFromFolderIDs(folderIDs: FolderID[]): Promise<ArFSPrivateFile[]> {
		return this.arFsDao.getAllPrivateChildrenFilesFromFolderIDs(folderIDs);
	}

	async getPrivateDrive(driveId: DriveID, drivePassword: string): Promise<ArFSPrivateDrive> {
		const driveEntity = await this.arFsDao.getPrivateDrive(driveId, drivePassword);
		return Promise.resolve(driveEntity);
	}
}
