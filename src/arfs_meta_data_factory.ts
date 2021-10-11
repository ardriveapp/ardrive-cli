import {
	ArFSDriveMetaDataPrototype,
	ArFSEntityMetaDataPrototype,
	ArFSFolderMetaDataPrototype
} from './arfs_prototypes';

import { DriveID, FolderID } from './types';

export type MoveEntityMetaDataFactory = () => ArFSEntityMetaDataPrototype;

export type FolderMetaDataFactory = (folderId: FolderID, parentFolderId?: FolderID) => ArFSFolderMetaDataPrototype;

export type CreateDriveMetaDataFactory = (
	driveID: DriveID,
	rootFolderId: FolderID
) => Promise<ArFSDriveMetaDataPrototype>;
