import {
	ArFSDAO,
	ArFSPublicDrive,
	ArFSDAOAnonymous,
	ArFSDAOType,
	ArFSPublicFolder,
	ArFSPrivateFolder,
	ArFSPrivateDrive,
	FolderHierarchy,
	ArFSPrivateFileOrFolderData,
	ArFSPublicFileOrFolderData,
	ArFSFileOrFolderEntity,
	ArFSPublicFile,
	ArFSPrivateFile
} from './arfsdao';
import { CommunityOracle } from './community/community_oracle';
import { ArFSEntity, DrivePrivacy, GQLTagInterface, winstonToAr } from 'ardrive-core-js';
import * as fs from 'fs';
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

export type FileUploadCosts = { winstonPrice: Winston; communityWinstonTip: Winston };

export function lastFolderRevisionFilter(
	entity: ArFSPublicFolder | ArFSPrivateFolder,
	index: number,
	allEntities: (ArFSPublicFolder | ArFSPrivateFolder)[]
): boolean {
	const allRevisions = allEntities.filter((e) => e.folderId === entity.folderId);
	const lastRevision = allRevisions[allRevisions.length - 1];
	return entity.txId === lastRevision.txId;
}

export function lastFileRevisionFilter(
	entity: ArFSPublicFile | ArFSPrivateFile,
	index: number,
	allEntities: (ArFSPublicFile | ArFSPrivateFile)[]
): boolean {
	const allRevisions = allEntities.filter((e) => e.fileId === entity.fileId);
	const lastRevision = allRevisions[allRevisions.length - 1];
	return entity.txId === lastRevision.txId;
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

	async getChildrenOfPublicFolder(folderId: FolderID): Promise<ArFSPublicFileOrFolderData[]> {
		const folder = await this.arFsDao.getPublicFolder(folderId);

		// Fetch all of the folder entities within the drive
		const driveIdOfFolder = folder.driveId;
		const allFolderEntitiesOfDrive = (await this.arFsDao.getAllFoldersOfPublicDrive(driveIdOfFolder)).filter(
			lastFolderRevisionFilter
		);

		// Feed entities to FolderHierarchy.setupNodesWithEntity()
		const hierarchy = FolderHierarchy.newFromEntities(allFolderEntitiesOfDrive);
		const folderIDs = hierarchy.allFolderIDs();

		// Fetch all file entities within all Folders of the drive
		const allFileEntitiesOfDrive = (await this.arFsDao.getAllPublicChildrenFilesFromFolderIDs(folderIDs)).filter(
			lastFileRevisionFilter
		);

		// Fetch all names of each entity
		const allEntitiesOfDrive = [...allFolderEntitiesOfDrive, ...allFileEntitiesOfDrive];

		const mergedData = allEntitiesOfDrive.map((entity) => {
			const path = `${hierarchy.pathToFolderId(entity.parentFolderId)}/${entity.name}`;
			const txPath = `${hierarchy.txPathToFolderId(entity.parentFolderId)}/${entity.txId}`;
			const entityIdPath = `${hierarchy.entityPathToFolderId(entity.parentFolderId)}/${entity.entityId}`;
			return new ArFSPublicFileOrFolderData(
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
				entity.entityId,
				path,
				txPath,
				entityIdPath
			);
		});
		return mergedData;
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
		// TODO: Assert that there's enough AR available in the wallet

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
		// TODO: Hoist this elsewhere for bulk uploads
		const { winstonPrice, communityWinstonTip } = await this.estimateAndAssertCostOfUploadSize(
			this.getFileSize(filePath),
			'public'
		);

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

	/** Computes the size of a private file encrypted with AES256-GCM */
	encryptedDataSize(dataSize: number): number {
		return (dataSize / 16 + 1) * 16;
	}

	async uploadPrivateFile(
		parentFolderId: FolderID,
		filePath: string,
		password: string,
		destinationFileName?: string
	): Promise<ArFSResult> {
		// TODO: Hoist this elsewhere for bulk uploads
		const { winstonPrice, communityWinstonTip } = await this.estimateAndAssertCostOfUploadSize(
			this.getFileSize(filePath),
			'private'
		);

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
		// TODO: Assert that there's enough AR available in the wallet

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
		// TODO: Assert that there's enough AR available in the wallet
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
		// TODO: Assert that there's enough AR available in the wallet
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

	async getPrivateFolder(folderId: FolderID, drivePassword: string): Promise<ArFSPrivateFolder> {
		const folderEntity = await this.arFsDao.getPrivateFolder(folderId, drivePassword);
		return folderEntity;
	}

	async getChildrenOfPrivateFolder(folderId: FolderID, password: string): Promise<ArFSPrivateFileOrFolderData[]> {
		const folder = await this.arFsDao.getPrivateFolder(folderId, password);

		// Fetch all of the folder entities within the drive
		const driveIdOfFolder = folder.driveId;
		const allFolderEntitiesOfDrive = (
			await this.arFsDao.getAllFoldersOfPrivateDrive(driveIdOfFolder, password)
		).filter(lastFolderRevisionFilter);

		// Feed entities to FolderHierarchy.setupNodesWithEntity()
		const hierarchy = FolderHierarchy.newFromEntities(allFolderEntitiesOfDrive);
		const folderIDs = hierarchy.allFolderIDs();

		// Fetch all file entities within all Folders of the drive
		const allFileEntitiesOfDrive = (
			await this.arFsDao.getAllPrivateChildrenFilesFromFolderIDs(folderIDs, password)
		).filter(lastFileRevisionFilter);

		// Fetch all names of each entity
		const allEntitiesOfDrive = [...allFolderEntitiesOfDrive, ...allFileEntitiesOfDrive];

		const mergedData = allEntitiesOfDrive.map((entity) => {
			const path = `${hierarchy.pathToFolderId(entity.parentFolderId)}/${entity.name}`;
			const txPath = `${hierarchy.txPathToFolderId(entity.parentFolderId)}/${entity.txId}`;
			const entityIdPath = `${hierarchy.entityPathToFolderId(entity.parentFolderId)}/${entity.entityId}`;
			return new ArFSPrivateFileOrFolderData(
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
				entity.entityId,
				entity.cipher,
				entity.cipherIV,
				path,
				txPath,
				entityIdPath
			);
		});
		return mergedData;
	}

	async estimateAndAssertCostOfUploadSize(fileSize: number, drivePrivacy: DrivePrivacy): Promise<FileUploadCosts> {
		if (fileSize < 1) {
			throw new Error('File size should be non-negative number!');
		}

		if (drivePrivacy === 'private') {
			fileSize = this.encryptedDataSize(fileSize);
		}

		// TODO: Consider metadata JSON size
		const totalSize = fileSize;

		const winstonPrice = await this.priceEstimator.getBaseWinstonPriceForByteCount(totalSize);

		// TODO: Consider tip reward via oracle that issues request to https://arweave.net/price/0/{target}
		const communityWinstonTip = await this.communityOracle.getCommunityWinstonTip(winstonPrice.toString());
		const totalWinstonPrice = (+winstonPrice + +communityWinstonTip).toString();

		if (!this.walletDao.walletHasBalance(this.wallet, totalWinstonPrice)) {
			throw new Error(`Not enough AR for data upload of size ${totalSize} bytes!`);
		}

		return { winstonPrice: winstonPrice.toString(), communityWinstonTip };
	}
}
