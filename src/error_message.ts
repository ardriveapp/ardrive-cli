import { FolderID } from './types';

export const errorMessage = {
	cannotMoveToDifferentDrive: 'Entity must stay in the same drive!',
	cannotMoveParentIntoChildFolder: 'Parent folder cannot be moved inside any of its children folders!',
	folderCannotMoveIntoItself: 'Folders cannot be moved into itself!',
	cannotMoveIntoSamePlace: (type: 'File' | 'Folder', parentFolderId: FolderID): string =>
		`${type} already has parent folder with ID: ${parentFolderId}`
};
