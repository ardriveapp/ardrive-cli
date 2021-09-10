import { ArFSDAO, ArFSPublicDrive, FolderID, TransactionID, DriveID } from './arfsdao';

export type ArFSEntityDataType = 'drive' | 'folder' | 'file';
export type ArFSTipType = 'drive' | 'folder';

export interface ArFSEntityData {
	type: ArFSEntityDataType;
	metadataTxId: TransactionID; // TODO: make a type that checks lengths
	key?: string;
}

// TODO: Is this really in the ArFS domain?
export interface ArFSTipData {
	type: ArFSTipType;
	txId: TransactionID; // TODO: make a type that checks lengths
	winston: number; // TODO: make a type that checks validity
}

export type ArFSFees = { [key: string]: number };

export interface CreateDriveResult {
	created: ArFSEntityData[];
	tips: ArFSTipData[];
	fees: ArFSFees;
}

// export interface UploadFileResult {
// 	created: ArFSEntityData[]
// 	tips: ArFSTipData[];
// 	fees: ArFSFees;
// }

export class ArDrive {
	constructor(private readonly arFsDao: ArFSDAO) {}

	async uploadPublicFile(
		parentFolderId: FolderID,
		filePath: string,
		destinationFileName?: string
	): Promise<CreateDriveResult> {
		const { dataTrx, metaDataTrx, fileId } = await this.arFsDao.uploadPublicFile(
			parentFolderId,
			filePath,
			destinationFileName
		);

		// TODO: send community tip
		return Promise.resolve({
			created: [
				{
					type: 'file',
					metadataTxId: metaDataTrx.id,
					dataTxId: dataTrx.id,
					entityId: fileId
				}
			],
			tips: [],
			fees: {
				[metaDataTrx.id]: +metaDataTrx.reward,
				[dataTrx.id]: +dataTrx.reward
				// qGr1BIVWQwdPMuQxJ9MmwMM8CBmZTIj9powGxJSZyi0: 344523
			}
		});
	}

	async uploadPrivateFile(
		parentFolderId: FolderID,
		filePath: string,
		password: string,
		destinationFileName?: string
	): Promise<CreateDriveResult> {
		const { dataTrx, metaDataTrx, fileId } = await this.arFsDao.uploadPrivateFile(
			parentFolderId,
			filePath,
			password,
			destinationFileName
		);

		// TODO: send community tip
		return Promise.resolve({
			created: [
				{
					type: 'file',
					metadataTxId: metaDataTrx.id,
					dataTxId: dataTrx.id,
					entityId: fileId
				}
			],
			tips: [],
			fees: {
				[metaDataTrx.id]: +metaDataTrx.reward,
				[dataTrx.id]: +dataTrx.reward
				// qGr1BIVWQwdPMuQxJ9MmwMM8CBmZTIj9powGxJSZyi0: 344523
			}
		});
	}

	async createPublicFolder(
		folderName: string,
		driveId: string,
		parentFolderId?: FolderID
	): Promise<CreateDriveResult> {
		// TODO: Fetch drive ID for parent folder ID

		// Generate a new drive ID
		const { folderTrx, folderId } = await this.arFsDao.createPublicFolder(folderName, driveId, parentFolderId);

		// IN THE FUTURE WE'LL SEND A COMMUNITY TIP HERE
		return Promise.resolve({
			created: [
				{
					type: 'folder',
					metadataTxId: folderTrx.id,
					entityId: folderId,
					key: ''
				}
			],
			tips: [],
			fees: {
				[folderTrx.id]: +folderTrx.reward
			}
		});
	}

	async createPublicDrive(driveName: string): Promise<CreateDriveResult> {
		// Generate a new drive ID
		const { driveTrx, rootFolderTrx, driveId, rootFolderId } = await this.arFsDao.createPublicDrive(driveName);

		// IN THE FUTURE WE'LL SEND A COMMUNITY TIP HERE
		return Promise.resolve({
			created: [
				{
					type: 'drive',
					metadataTxId: driveTrx.id,
					entityId: driveId,
					key: ''
				},
				{
					type: 'folder',
					metadataTxId: rootFolderTrx.id,
					entityId: rootFolderId,
					key: ''
				}
			],
			tips: [],
			fees: {
				[driveTrx.id]: +driveTrx.reward,
				[rootFolderTrx.id]: +rootFolderTrx.reward
			}
		});
	}

	async createPrivateDrive(driveName: string, password: string): Promise<CreateDriveResult> {
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
