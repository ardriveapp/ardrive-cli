import { createWriteStream, mkdir } from 'fs';
import { join as joinPath } from 'path';
import { pipeline } from 'stream';
import { promisify } from 'util';
import {
	GetPublicDriveParams,
	GetPublicFolderParams,
	GetPublicFileParams,
	GetAllDrivesForAddressParams,
	ListPublicFolderParams
} from './ardrive.types';
import { ArFSDAOAnonymous, ArFSDAOType } from './arfsdao_anonymous';
import {
	ArFSDriveEntity,
	ArFSPublicDrive,
	ArFSPublicFile,
	ArFSPublicFileOrFolderWithPaths,
	ArFSPublicFolder
} from './arfs_entities';
import { ArweaveAddress, DriveID, FolderID } from './types';

const pipelinePromise = promisify(pipeline);
const mkdirPromise = promisify(mkdir);
export abstract class ArDriveType {
	protected abstract readonly arFsDao: ArFSDAOType;
}

export class ArDriveAnonymous extends ArDriveType {
	constructor(protected readonly arFsDao: ArFSDAOAnonymous) {
		super();
	}

	public async getOwnerForDriveId(driveId: DriveID): Promise<ArweaveAddress> {
		return this.arFsDao.getOwnerForDriveId(driveId);
	}

	public async getPublicDrive({ driveId, owner }: GetPublicDriveParams): Promise<ArFSPublicDrive> {
		if (!owner) {
			owner = await this.getOwnerForDriveId(driveId);
		}

		return this.arFsDao.getPublicDrive(driveId, owner);
	}

	public async getPublicFolder({ folderId, owner }: GetPublicFolderParams): Promise<ArFSPublicFolder> {
		if (!owner) {
			owner = await this.arFsDao.getDriveOwnerForFolderId(folderId);
		}

		return this.arFsDao.getPublicFolder(folderId, owner);
	}

	public async getPublicFile({ fileId, owner }: GetPublicFileParams): Promise<ArFSPublicFile> {
		if (!owner) {
			owner = await this.arFsDao.getDriveOwnerForFileId(fileId);
		}

		return this.arFsDao.getPublicFile(fileId, owner);
	}

	public async getAllDrivesForAddress({
		address,
		privateKeyData
	}: GetAllDrivesForAddressParams): Promise<ArFSDriveEntity[]> {
		return this.arFsDao.getAllDrivesForAddress(address, privateKeyData);
	}

	/**
	 * Lists the children of certain public folder
	 * @param {FolderID} folderId the folder ID to list children of
	 * @returns {ArFSPublicFileOrFolderWithPaths[]} an array representation of the children and parent folder
	 */
	public async listPublicFolder({
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

	/**
	 *
	 * @param folderId - the ID of the folder to be download
	 * @returns - the array of streams to write
	 */
	async downloadPublicFolder(folderId: FolderID, maxDepth: number, path: string): Promise<void> {
		// const children = folderEntityDump.slice(1);
		const folderEntityDump = await this.listPublicFolder({ folderId, maxDepth, includeRoot: true });
		const rootFolder = folderEntityDump[0];
		const rootFolderPath = rootFolder.path;
		const basePath = rootFolderPath.replace(/\/[^/]+$/, '');
		for (const entity of folderEntityDump) {
			const relativePath = entity.path.replace(new RegExp(`^${basePath}/`), '');
			const fullPath = joinPath(path, relativePath);
			console.log(`About to write "${fullPath}"`);
			switch (entity.entityType) {
				case 'folder':
					await mkdirPromise(fullPath);
					break;
				case 'file':
					await this.downloadPublicFile(entity.getEntity(), fullPath);
					break;
				default:
					throw new Error(`Unsupported entity type: ${entity.entityType}`);
			}
		}
	}

	async downloadPublicFile(publicFile: ArFSPublicFile, path: string): Promise<void> {
		const fileTxId = publicFile.dataTxId;
		const downloadStream = await this.arFsDao.downloadFileData(fileTxId);
		const writeStream = createWriteStream(path);
		return pipelinePromise(downloadStream, writeStream);
	}
}
