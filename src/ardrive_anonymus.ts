import { ArDriveType, ListPublicFolderParams } from './ardrive';
import { ArFSDAOAnonymous } from './arfsdao_anonymous';
import {
	ArFSDriveEntity,
	ArFSPublicDrive,
	ArFSPublicFile,
	ArFSPublicFileOrFolderWithPaths,
	ArFSPublicFolder
} from './arfs_entities';
import { PrivateKeyData } from './private_key_data';
import { ArweaveAddress, DriveID, FileID, FolderID } from './types';

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
