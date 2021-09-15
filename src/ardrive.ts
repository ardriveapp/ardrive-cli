import { ArweaveAddress, Wallet, WalletDAO, Winston } from './wallet_new';
import { ArFSDAO, ArFSPublicDrive, FolderID, TransactionID, DriveID } from './arfsdao';
import { CommunityOracle } from './community/community_oracle';
import { winstonToAr } from 'ardrive-core-js';
import * as fs from 'fs';

export type Bytes = number;

export type ArFSEntityDataType = 'drive' | 'folder' | 'file';
export type ArFSTipType = 'drive' | 'folder';

export interface ArFSEntityData {
	type: ArFSEntityDataType;
	metadataTxId: TransactionID; // TODO: make a type that checks lengths
	key?: string;
}

// TODO: Is this really in the ArFS domain?
export interface ArFSTipData {
	txId: TransactionID; // TODO: make a type that checks lengths
	tokenHolder: ArweaveAddress;
	winston: Winston; // TODO: make a type that checks validity
}

export type ArFSFees = { [key: string]: number };

export interface ArFSResult {
	created: ArFSEntityData[];
	tips: ArFSTipData[];
	fees: ArFSFees;
}

export class ArDrive {
	constructor(
		private readonly wallet: Wallet,
		private readonly walletDao: WalletDAO,
		private readonly arFsDao: ArFSDAO,
		private readonly communityOracle: CommunityOracle
	) {}

	// TODO: FS shouldn't be reading the files more than once and doesn't belong in this class
	getFileSize(filePath: string): Bytes {
		return fs.statSync(filePath).size;
	}

	async sendCommunityTip(communityWinstonTip: Winston): Promise<ArFSTipData> {
		const tokenHolder: ArweaveAddress = await this.communityOracle.selectTokenHolder();

		const communityTipResult = await this.walletDao.sendARToAddress(
			winstonToAr(+communityWinstonTip),
			this.wallet,
			tokenHolder,
			[
				{ name: 'appName', value: 'ArDrive-CLI' },
				{ name: 'appVersion', value: '2.0' },
				{ name: 'trxType', value: 'Community-Tip' }
			]
		);

		return { txId: communityTipResult.trxID, tokenHolder: tokenHolder, winston: communityTipResult.winston };
	}

	async uploadPublicFile(
		parentFolderId: FolderID,
		filePath: string,
		destinationFileName?: string
	): Promise<ArFSResult> {
		const winstonPrice = await this.walletDao.getWinstonPriceForBytes(this.getFileSize(filePath));
		const communityWinstonTip = await this.communityOracle.getCommunityWinstonTip(winstonPrice);
		const totalWinstonPrice = (+winstonPrice + +communityWinstonTip).toString();

		if (!this.walletDao.confirmBalance(this.wallet, totalWinstonPrice)) {
			throw new Error('Not enough AR for file upload..');
		}

		// TODO: Add interactive confirmation of AR price estimation

		const { dataTrx, metaDataTrx, fileId } = await this.arFsDao.uploadPublicFile(
			parentFolderId,
			filePath,
			destinationFileName
		);

		const communityTipResult = await this.sendCommunityTip(communityWinstonTip);

		return Promise.resolve({
			created: [
				{
					type: 'file',
					metadataTxId: metaDataTrx.id,
					dataTxId: dataTrx.id,
					entityId: fileId
				}
			],
			tips: [communityTipResult],
			fees: {
				[metaDataTrx.id]: +metaDataTrx.reward,
				[dataTrx.id]: +dataTrx.reward
			}
		});
	}

	async uploadPrivateFile(
		parentFolderId: FolderID,
		filePath: string,
		password: string,
		destinationFileName?: string
	): Promise<ArFSResult> {
		const winstonPrice = await this.walletDao.getWinstonPriceForBytes(this.getFileSize(filePath));
		const communityWinstonTip = await this.communityOracle.getCommunityWinstonTip(winstonPrice);
		const totalWinstonPrice = (+winstonPrice + +communityWinstonTip).toString();

		if (!this.walletDao.confirmBalance(this.wallet, totalWinstonPrice)) {
			throw new Error('Not enough AR for file upload..');
		}

		// TODO: Add interactive confirmation of AR price estimation

		const { dataTrx, metaDataTrx, fileId } = await this.arFsDao.uploadPrivateFile(
			parentFolderId,
			filePath,
			password,
			destinationFileName
		);

		const communityTipResult = await this.sendCommunityTip(communityWinstonTip);

		return Promise.resolve({
			created: [
				{
					type: 'file',
					metadataTxId: metaDataTrx.id,
					dataTxId: dataTrx.id,
					entityId: fileId,
					key: ''
				}
			],
			tips: [communityTipResult],
			fees: {
				[metaDataTrx.id]: +metaDataTrx.reward,
				[dataTrx.id]: +dataTrx.reward
			}
		});
	}

	async createPublicFolder(folderName: string, driveId: string, parentFolderId?: FolderID): Promise<ArFSResult> {
		// TODO: Fetch drive ID for parent folder ID

		// Generate a new drive ID
		const { folderTrx, folderId } = await this.arFsDao.createPublicFolder(folderName, driveId, parentFolderId);

		// IN THE FUTURE WE'LL SEND A COMMUNITY TIP HERE
		return Promise.resolve({
			created: [
				{
					type: 'folder',
					metadataTxId: folderTrx.id,
					entityId: folderId
				}
			],
			tips: [],
			fees: {
				[folderTrx.id]: +folderTrx.reward
			}
		});
	}

	async createPublicDrive(driveName: string): Promise<ArFSResult> {
		// Generate a new drive ID
		const { driveTrx, rootFolderTrx, driveId, rootFolderId } = await this.arFsDao.createPublicDrive(driveName);

		// IN THE FUTURE WE'LL SEND A COMMUNITY TIP HERE
		return Promise.resolve({
			created: [
				{
					type: 'drive',
					metadataTxId: driveTrx.id,
					entityId: driveId
				},
				{
					type: 'folder',
					metadataTxId: rootFolderTrx.id,
					entityId: rootFolderId
				}
			],
			tips: [],
			fees: {
				[driveTrx.id]: +driveTrx.reward,
				[rootFolderTrx.id]: +rootFolderTrx.reward
			}
		});
	}

	async createPrivateDrive(driveName: string, password: string): Promise<ArFSResult> {
		// Generate a new drive ID
		const { driveTrx, rootFolderTrx, driveId, rootFolderId, driveKey } = await this.arFsDao.createPrivateDrive(
			driveName,
			password
		);

		// IN THE FUTURE WE'LL SEND A COMMUNITY TIP HERE
		return Promise.resolve({
			created: [
				{
					type: 'drive',
					metadataTxId: driveTrx.id,
					entityId: driveId,
					key: driveKey.toString('hex')
				},
				{
					type: 'folder',
					metadataTxId: rootFolderTrx.id,
					entityId: rootFolderId,
					key: driveKey.toString('hex')
				}
			],
			tips: [],
			fees: {
				[driveTrx.id]: +driveTrx.reward,
				[rootFolderTrx.id]: +rootFolderTrx.reward
			}
		});
	}

	async getPublicDrive(driveId: DriveID): Promise<ArFSPublicDrive> {
		const driveEntity = await this.arFsDao.getPublicDrive(driveId);
		return Promise.resolve(driveEntity);
	}
}
