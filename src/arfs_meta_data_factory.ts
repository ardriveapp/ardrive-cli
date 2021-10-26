import {
	ArFSDriveMetaDataPrototype,
	ArFSEntityMetaDataPrototype,
	ArFSFileDataPrototype,
	ArFSFileMetaDataPrototype,
	ArFSFolderMetaDataPrototype
} from './arfs_prototypes';
import { ArFSFileMetadataTransactionData } from './arfs_trx_data_types';

import { ByteCount, DataContentType, DriveID, FileID, FolderID, TransactionID, UnixTime } from './types';

export type MoveEntityMetaDataFactory = () => ArFSEntityMetaDataPrototype;

export type FolderMetaDataFactory = (folderId: FolderID, parentFolderId?: FolderID) => ArFSFolderMetaDataPrototype;

export type FileDataPrototypeFactory = (
	desfileData: Buffer,
	dataContentType: DataContentType,
	fileId: FileID
) => Promise<ArFSFileDataPrototype>;

export type FileMetadataTrxDataFactory<D extends ArFSFileMetadataTransactionData> = (
	destinationFileName: string,
	fileSize: ByteCount,
	lastModifiedDateMS: UnixTime,
	dataTrxId: TransactionID,
	dataContentType: DataContentType,
	fileId: FileID
) => Promise<D>;

export type FileMetaDataFactory<D extends ArFSFileMetadataTransactionData> = (
	metadataTrxData: D,
	fileId: FileID
) => ArFSFileMetaDataPrototype;

export type CreateDriveMetaDataFactory = (
	driveID: DriveID,
	rootFolderId: FolderID
) => Promise<ArFSDriveMetaDataPrototype>;
