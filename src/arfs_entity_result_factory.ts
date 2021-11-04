import { ArFSFileMetadataTransactionData } from './arfs_trx_data_types';
import { DriveID, FolderID, FileID, FileKey, DriveKey } from './types';
import { TransactionID, Winston } from './types/';

export interface ArFSWriteResult {
	metaDataTrxId: TransactionID;
	metaDataTrxReward: Winston;
}

export interface ArFSCreateDriveResult extends ArFSWriteResult {
	rootFolderTrxId: TransactionID;
	rootFolderTrxReward: Winston;
	driveId: DriveID;
	rootFolderId: FolderID;
}

export interface ArFSCreateFolderResult extends ArFSWriteResult {
	folderId: FolderID;
}

export interface ArFSUploadFileResult extends ArFSWriteResult {
	dataTrxId: TransactionID;
	dataTrxReward: Winston;
	fileId: FileID;
}

export type ArFSMoveEntityResult = ArFSWriteResult;

export interface ArFSMoveFileResult extends ArFSMoveEntityResult {
	dataTrxId: TransactionID;
}

export type WithDriveKey = { driveKey: DriveKey };
type WithFileKey = { fileKey: FileKey };

export type ArFSCreatePublicDriveResult = ArFSCreateDriveResult;
export type ArFSCreatePrivateDriveResult = ArFSCreateDriveResult & WithDriveKey;

export type ArFSCreatePublicFolderResult = ArFSCreateFolderResult;
export type ArFSCreatePrivateFolderResult = ArFSCreateFolderResult & WithDriveKey;

export type ArFSUploadPublicFileResult = ArFSUploadFileResult;
export type ArFSUploadPrivateFileResult = ArFSUploadFileResult & WithFileKey;

export type ArFSMovePublicFolderResult = ArFSMoveEntityResult;
export type ArFSMovePrivateFolderResult = ArFSMoveEntityResult & WithDriveKey;

export type ArFSMovePublicFileResult = ArFSMoveFileResult;
export type ArFSMovePrivateFileResult = ArFSMoveFileResult & WithFileKey;

// Result factory function types
export type ArFSMoveEntityResultFactory<R extends ArFSMoveEntityResult> = (result: ArFSMoveEntityResult) => R;
export type ArFSCreateDriveResultFactory<R extends ArFSCreateDriveResult> = (result: ArFSCreateDriveResult) => R;
export type ArFSCreateFolderResultFactory<R extends ArFSCreateFolderResult> = (result: ArFSCreateFolderResult) => R;
export type ArFSUploadFileResultFactory<R extends ArFSUploadFileResult, D extends ArFSFileMetadataTransactionData> = (
	result: ArFSUploadFileResult,
	trxData: D
) => R;
