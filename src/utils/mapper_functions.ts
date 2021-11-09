import { ArFSFileOrFolderEntity } from '../arfs_entities';
import { FileID, FolderID } from '../types';

export interface EntityNamesAndIds {
	files: FileNameAndId[];
	folders: FolderNameAndId[];
}

interface FolderNameAndId {
	folderName: string;
	folderId: FolderID;
}

interface FileNameAndId {
	fileName: string;
	fileId: FileID;
}

export function entityToNameMap(entity: ArFSFileOrFolderEntity): string {
	return entity.name;
}

export function folderToNameAndIdMap(entity: ArFSFileOrFolderEntity): FolderNameAndId {
	return { folderId: entity.entityId, folderName: entity.name };
}

export function fileToNameAndIdMap(entity: ArFSFileOrFolderEntity): FileNameAndId {
	return { fileId: entity.entityId, fileName: entity.name };
}
