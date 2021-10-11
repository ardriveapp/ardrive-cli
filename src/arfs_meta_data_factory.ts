import {
	ArFSFileOrFolderEntity,
	ArFSPrivateFile,
	ArFSPrivateFolder,
	ArFSPublicFile,
	ArFSPublicFolder
} from './arfsdao';
import {
	ArFSEntityMetaDataPrototype,
	ArFSPrivateFileMetaDataPrototype,
	ArFSPrivateFolderMetaDataPrototype,
	ArFSPublicFileMetaDataPrototype,
	ArFSPublicFolderMetaDataPrototype
} from './arfs_prototypes';
import {
	ArFSObjectTransactionData,
	ArFSPrivateFileMetadataTransactionData,
	ArFSPrivateFolderTransactionData,
	ArFSPublicFileMetadataTransactionData,
	ArFSPublicFolderTransactionData
} from './arfs_trx_data_types';
import { FolderID } from './types';

export type MetaDataFactoryFunction<
	T extends ArFSFileOrFolderEntity,
	U extends ArFSObjectTransactionData,
	R extends ArFSEntityMetaDataPrototype
> = (newParentFolderId: FolderID, originalMetaData: T, transactionData: U) => R;

export const movePrivateFileMetaDataFactory: MetaDataFactoryFunction<
	ArFSPrivateFile,
	ArFSPrivateFileMetadataTransactionData,
	ArFSPrivateFileMetaDataPrototype
> = (newParentFolderId, originalMetaData, transactionData) => {
	return new ArFSPrivateFileMetaDataPrototype(
		transactionData,
		originalMetaData.driveId,
		originalMetaData.fileId,
		newParentFolderId
	);
};

export const movePublicFileMetaDataFactory: MetaDataFactoryFunction<
	ArFSPublicFile,
	ArFSPublicFileMetadataTransactionData,
	ArFSPublicFileMetaDataPrototype
> = (newParentFolderId, originalMetaData, transactionData) => {
	return new ArFSPublicFileMetaDataPrototype(
		transactionData,
		originalMetaData.driveId,
		originalMetaData.fileId,
		newParentFolderId
	);
};

export const movePrivateFolderMetaDataFactory: MetaDataFactoryFunction<
	ArFSPrivateFolder,
	ArFSPrivateFolderTransactionData,
	ArFSPrivateFolderMetaDataPrototype
> = (newParentFolderId, originalMetaData, transactionData) => {
	return new ArFSPrivateFolderMetaDataPrototype(
		originalMetaData.driveId,
		originalMetaData.entityId,
		transactionData,
		newParentFolderId
	);
};

export const movePublicFolderMetaDataFactory: MetaDataFactoryFunction<
	ArFSPublicFolder,
	ArFSPublicFolderTransactionData,
	ArFSPublicFolderMetaDataPrototype
> = (newParentFolderId, originalMetaData, transactionData) => {
	return new ArFSPublicFolderMetaDataPrototype(
		transactionData,
		originalMetaData.driveId,
		originalMetaData.entityId,
		newParentFolderId
	);
};
