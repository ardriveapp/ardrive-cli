import { ArFSFileOrFolderEntity } from '../arfs_entities';
import { FileID, FolderID, UnixTime } from '../types';

export interface EntityNamesAndIds {
	files: FileConflictInfo[];
	folders: FolderNameAndId[];
}

interface FolderNameAndId {
	folderName: string;
	folderId: FolderID;
}

export interface FileConflictInfo {
	fileName: string;
	fileId: FileID;
	lastModifiedDate: UnixTime;
}

export function entityToNameMap(entity: ArFSFileOrFolderEntity): string {
	return entity.name;
}

export function folderToNameAndIdMap(entity: ArFSFileOrFolderEntity): FolderNameAndId {
	return { folderId: entity.entityId, folderName: entity.name };
}

export function fileConflictInfoMap(entity: ArFSFileOrFolderEntity): FileConflictInfo {
	return { fileId: entity.entityId, fileName: entity.name, lastModifiedDate: entity.lastModifiedDate };
}
