import {
	ArFSDAO,
	ArFSPublicDrive,
	FolderID,
	TransactionID,
	DriveID,
	ArFSDAOAnonymous,
	ArFSDAOType,
	ArFSPublicFolder,
	ArFSPrivateFolder,
	ArFSPublicFile,
	ArFSPrivateFile,
	ArFSFileOrFolderEntity
} from './arfsdao';

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

export interface ArFSResult {
	created: ArFSEntityData[];
	tips: ArFSTipData[];
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
	constructor(protected readonly arFsDao: ArFSDAO) {
		super(arFsDao);
	}

	async uploadPublicFile(
		parentFolderId: FolderID,
		filePath: string,
		destinationFileName?: string
	): Promise<ArFSResult> {
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
	): Promise<ArFSResult> {
		// Retrieve drive ID from folder ID and ensure that it is indeed a private drive
		const driveId = await this.arFsDao.getDriveIdForFolderId(parentFolderId);
		const drive = await this.arFsDao.getPrivateDrive(driveId, password);
		if (!drive) {
			throw new Error(`Private drive with Drive ID ${driveId} not found!`);
		}

		const { dataTrx, metaDataTrx, fileId } = await this.arFsDao.preparePrivateFileTransactions(
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

	async createPublicDrive(driveName: string): Promise<ArFSResult> {
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

<<<<<<< HEAD
	async getPrivateDrive(driveId: DriveID): Promise<ArFSPublicDrive> {
		const driveEntity = await this.arFsDao.getPrivateDrive(driveId);
		return driveEntity;
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
=======
	async getPrivateDrive(driveId: DriveID, drivePassword: string): Promise<ArFSPublicDrive> {
		const driveEntity = await this.arFsDao.getPrivateDrive(driveId, drivePassword);
		return Promise.resolve(driveEntity);
>>>>>>> 9e2118d (fix(get private drive): Decrypt data and properly build private drive PE-315)
	}
}
