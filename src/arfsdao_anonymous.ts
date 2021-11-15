/* eslint-disable no-console */
import Arweave from 'arweave';
import { ArFSDriveEntity, GQLEdgeInterface } from 'ardrive-core-js';
import { ASCENDING_ORDER, buildQuery } from './query';
import { DriveID, FolderID, FileID, DEFAULT_APP_NAME, DEFAULT_APP_VERSION, EntityID } from './types';
import { latestRevisionFilter, latestRevisionFilterForDrives } from './utils/filter_methods';
import { FolderHierarchy } from './folderHierarchy';
import { ArFSPublicDriveBuilder, SafeArFSDriveBuilder } from './utils/arfs_builders/arfs_drive_builders';
import { ArFSPublicFolderBuilder } from './utils/arfs_builders/arfs_folder_builders';
import { ArFSPublicFileBuilder } from './utils/arfs_builders/arfs_file_builders';
import { ArFSPublicDrive, ArFSPublicFile, ArFSPublicFileOrFolderWithPaths, ArFSPublicFolder } from './arfs_entities';
import { PrivateKeyData } from './private_key_data';
import { ArweaveAddress } from './arweave_address';

export const graphQLURL = 'https://arweave.net/graphql';

export interface ArFSAllPublicFoldersOfDriveParams {
	driveId: DriveID;
	owner: ArweaveAddress;
	latestRevisionsOnly: boolean;
}

export interface ArFSListPublicFolderParams {
	folderId: FolderID;
	maxDepth: number;
	includeRoot: boolean;
	owner: ArweaveAddress;
}

export abstract class ArFSDAOType {
	protected abstract readonly arweave: Arweave;
	protected abstract readonly appName: string;
	protected abstract readonly appVersion: string;
}

/**
 * Performs all ArFS spec operations that do NOT require a wallet for signing or decryption
 */
export class ArFSDAOAnonymous extends ArFSDAOType {
	constructor(
		protected readonly arweave: Arweave,
		protected appName = DEFAULT_APP_NAME,
		protected appVersion = DEFAULT_APP_VERSION
	) {
		super();
	}

	public async getOwnerForDriveId(driveId: DriveID): Promise<ArweaveAddress> {
		const gqlQuery = buildQuery({
			tags: [
				{ name: 'Drive-Id', value: `${driveId}` },
				{ name: 'Entity-Type', value: 'drive' }
			],
			sort: ASCENDING_ORDER
		});
		const response = await this.arweave.api.post(graphQLURL, gqlQuery);
		const edges: GQLEdgeInterface[] = response.data.data.transactions.edges;

		if (!edges.length) {
			throw new Error(`Could not find a transaction with "Drive-Id": ${driveId}`);
		}

		const edgeOfFirstDrive = edges[0];

		const driveOwnerAddress = edgeOfFirstDrive.node.owner.address;

		return new ArweaveAddress(driveOwnerAddress);
	}

	async getDriveIDForEntityId(entityId: EntityID, gqlTypeTag: 'File-Id' | 'Folder-Id'): Promise<DriveID> {
		const gqlQuery = buildQuery({ tags: [{ name: gqlTypeTag, value: entityId }] });

		const response = await this.arweave.api.post(graphQLURL, gqlQuery);
		const { data } = response.data;
		const { transactions } = data;

		const edges: GQLEdgeInterface[] = transactions.edges;

		if (!edges.length) {
			throw new Error(`Entity with ${gqlTypeTag} ${entityId} not found!`);
		}

		const driveIdTag = edges[0].node.tags.find((t) => t.name === 'Drive-Id');
		if (driveIdTag) {
			return driveIdTag.value;
		}

		throw new Error(`No Drive-Id tag found for meta data transaction of ${gqlTypeTag}: ${entityId}`);
	}

	async getDriveOwnerForFolderId(folderId: FolderID): Promise<ArweaveAddress> {
		return this.getOwnerForDriveId(await this.getDriveIdForFolderId(folderId));
	}

	async getDriveOwnerForFileId(fileId: FileID): Promise<ArweaveAddress> {
		return this.getOwnerForDriveId(await this.getDriveIdForFileId(fileId));
	}

	async getDriveIdForFileId(fileId: FileID): Promise<DriveID> {
		return this.getDriveIDForEntityId(fileId, 'File-Id');
	}

	async getDriveIdForFolderId(folderId: FolderID): Promise<DriveID> {
		return this.getDriveIDForEntityId(folderId, 'Folder-Id');
	}

	// Convenience function for known-public use cases
	async getPublicDrive(driveId: DriveID, owner: ArweaveAddress): Promise<ArFSPublicDrive> {
		return new ArFSPublicDriveBuilder({ entityId: driveId, arweave: this.arweave, owner }).build();
	}

	// Convenience function for known-private use cases
	async getPublicFolder(folderId: FolderID, owner: ArweaveAddress): Promise<ArFSPublicFolder> {
		return new ArFSPublicFolderBuilder({ entityId: folderId, arweave: this.arweave, owner }).build();
	}

	async getPublicFile(fileId: FileID, owner: ArweaveAddress): Promise<ArFSPublicFile> {
		return new ArFSPublicFileBuilder({ entityId: fileId, arweave: this.arweave, owner }).build();
	}

	async getAllDrivesForAddress(
		address: ArweaveAddress,
		privateKeyData: PrivateKeyData,
		latestRevisionsOnly = true
	): Promise<ArFSDriveEntity[]> {
		let cursor = '';
		let hasNextPage = true;
		const allDrives: ArFSDriveEntity[] = [];

		while (hasNextPage) {
			const gqlQuery = buildQuery({ tags: [{ name: 'Entity-Type', value: 'drive' }], cursor, owner: address });

			const response = await this.arweave.api.post(graphQLURL, gqlQuery);
			const { data } = response.data;
			const { transactions } = data;
			const { edges } = transactions;
			hasNextPage = transactions.pageInfo.hasNextPage;

			const drives: Promise<ArFSDriveEntity>[] = edges.map(async (edge: GQLEdgeInterface) => {
				const { node } = edge;
				cursor = edge.cursor;

				const driveBuilder = SafeArFSDriveBuilder.fromArweaveNode(node, this.arweave, privateKeyData);

				return driveBuilder.build(node);
			});

			allDrives.push(...(await Promise.all(drives)));
		}

		return latestRevisionsOnly ? allDrives.filter(latestRevisionFilterForDrives) : allDrives;
	}

	async getPublicFilesWithParentFolderIds(
		folderIDs: FolderID[],
		owner: ArweaveAddress,
		latestRevisionsOnly = false
	): Promise<ArFSPublicFile[]> {
		let cursor = '';
		let hasNextPage = true;
		const allFiles: ArFSPublicFile[] = [];

		while (hasNextPage) {
			const gqlQuery = buildQuery({
				tags: [
					{ name: 'Parent-Folder-Id', value: folderIDs },
					{ name: 'Entity-Type', value: 'file' }
				],
				cursor,
				owner
			});

			const response = await this.arweave.api.post(graphQLURL, gqlQuery);
			const { data } = response.data;
			const { transactions } = data;
			const { edges } = transactions;
			hasNextPage = transactions.pageInfo.hasNextPage;
			const files: Promise<ArFSPublicFile>[] = edges.map(async (edge: GQLEdgeInterface) => {
				const { node } = edge;
				cursor = edge.cursor;
				const fileBuilder = ArFSPublicFileBuilder.fromArweaveNode(node, this.arweave);
				return fileBuilder.build(node);
			});
			allFiles.push(...(await Promise.all(files)));
		}
		return latestRevisionsOnly ? allFiles.filter(latestRevisionFilter) : allFiles;
	}

	async getAllFoldersOfPublicDrive({
		driveId,
		owner,
		latestRevisionsOnly = false
	}: ArFSAllPublicFoldersOfDriveParams): Promise<ArFSPublicFolder[]> {
		let cursor = '';
		let hasNextPage = true;
		const allFolders: ArFSPublicFolder[] = [];

		while (hasNextPage) {
			const gqlQuery = buildQuery({
				tags: [
					{ name: 'Drive-Id', value: driveId },
					{ name: 'Entity-Type', value: 'folder' }
				],
				cursor,
				owner
			});

			const response = await this.arweave.api.post(graphQLURL, gqlQuery);
			const { data } = response.data;
			const { transactions } = data;
			const { edges } = transactions;

			hasNextPage = transactions.pageInfo.hasNextPage;
			const folders: Promise<ArFSPublicFolder>[] = edges.map(async (edge: GQLEdgeInterface) => {
				const { node } = edge;
				cursor = edge.cursor;
				const folderBuilder = ArFSPublicFolderBuilder.fromArweaveNode(node, this.arweave);
				return await folderBuilder.build(node);
			});
			allFolders.push(...(await Promise.all(folders)));
		}
		return latestRevisionsOnly ? allFolders.filter(latestRevisionFilter) : allFolders;
	}

	/**
	 * Lists the children of certain public folder
	 * @param {FolderID} folderId the folder ID to list children of
	 * @param {number} maxDepth a non-negative integer value indicating the depth of the folder tree to list where 0 = this folder's contents only
	 * @param {boolean} includeRoot whether or not folderId's folder data should be included in the listing
	 * @returns {ArFSPublicFileOrFolderWithPaths[]} an array representation of the children and parent folder
	 */
	async listPublicFolder({
		folderId,
		maxDepth,
		includeRoot,
		owner
	}: ArFSListPublicFolderParams): Promise<ArFSPublicFileOrFolderWithPaths[]> {
		if (!Number.isInteger(maxDepth) || maxDepth < 0) {
			throw new Error('maxDepth should be a non-negative integer!');
		}

		const folder = await this.getPublicFolder(folderId, owner);

		// Fetch all of the folder entities within the drive
		const driveIdOfFolder = folder.driveId;
		const allFolderEntitiesOfDrive = await this.getAllFoldersOfPublicDrive({
			driveId: driveIdOfFolder,
			owner,
			latestRevisionsOnly: true
		});

		// Feed entities to FolderHierarchy
		const hierarchy = FolderHierarchy.newFromEntities(allFolderEntitiesOfDrive);
		const searchFolderIDs = hierarchy.folderIdSubtreeFromFolderId(folderId, maxDepth - 1);
		const [, ...subFolderIDs]: FolderID[] = hierarchy.folderIdSubtreeFromFolderId(folderId, maxDepth);

		const childrenFolderEntities = allFolderEntitiesOfDrive.filter((folder) =>
			subFolderIDs.includes(folder.entityId)
		);

		if (includeRoot) {
			childrenFolderEntities.unshift(folder);
		}

		// Fetch all file entities within all Folders of the drive
		const childrenFileEntities = await this.getPublicFilesWithParentFolderIds(searchFolderIDs, owner, true);

		const children = [...childrenFolderEntities, ...childrenFileEntities];

		const entitiesWithPath = children.map((entity) => new ArFSPublicFileOrFolderWithPaths(entity, hierarchy));
		return entitiesWithPath;
	}
}
