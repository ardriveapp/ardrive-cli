import { FolderID } from './types';

// TODO: Extract more error messages to share for testing

export const errorMessage = {
	cannotMoveToDifferentDrive: 'Entity must stay in the same drive!',
	cannotMoveParentIntoChildFolder: 'Parent folder cannot be moved inside any of its children folders!',
	cannotMoveIntoSamePlace: (type: 'File' | 'Folder', parentFolderId: FolderID): string =>
		`${type} already has parent folder with ID: ${parentFolderId}`
};
