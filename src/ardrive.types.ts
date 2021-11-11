import { PrivateDriveKeyData } from './arfsdao';
import { ArFSListPublicFolderParams } from './arfsdao_anonymous';
import { WithDriveKey } from './arfs_entity_result_factory';
import { ArFSFolderToUpload, ArFSFileToUpload } from './arfs_file_wrapper';
import { PrivateKeyData } from './private_key_data';
import {
	TransactionID,
	AnyEntityID,
	MakeOptional,
	ArweaveAddress,
	Winston,
	FolderID,
	DriveID,
	FileID,
	CipherIV
} from './types';

export type ArFSEntityDataType = 'drive' | 'folder' | 'file';

export interface ArFSEntityData {
	type: ArFSEntityDataType;
	metadataTxId: TransactionID;
	dataTxId?: TransactionID;
	entityId: AnyEntityID;
	key?: string;
}

export type ListPublicFolderParams = MakeOptional<ArFSListPublicFolderParams, 'maxDepth' | 'includeRoot' | 'owner'>;
export type ListPrivateFolderParams = ListPublicFolderParams & WithDriveKey;

export interface TipData {
	txId: TransactionID;
	recipient: ArweaveAddress;
	winston: Winston;
}

export interface TipResult {
	tipData: TipData;
	reward: Winston;
}

export type ArFSFees = { [key: string]: Winston };

export interface ArFSResult {
	created: ArFSEntityData[];
	tips: TipData[];
	fees: ArFSFees;
}

export const emptyArFSResult: ArFSResult = {
	created: [],
	tips: [],
	fees: {}
};

export interface MetaDataBaseCosts {
	metaDataBaseReward: Winston;
}

export interface BulkFileBaseCosts extends MetaDataBaseCosts {
	fileDataBaseReward: Winston;
}
export interface FileUploadBaseCosts extends BulkFileBaseCosts {
	communityWinstonTip: Winston;
}

export interface DriveUploadBaseCosts {
	driveMetaDataBaseReward: Winston;
	rootFolderMetaDataBaseReward: Winston;
}

export interface RecursivePublicBulkUploadParams {
	parentFolderId: FolderID;
	wrappedFolder: ArFSFolderToUpload;
	driveId: DriveID;
	owner: ArweaveAddress;
	conflictResolution: FileNameConflictResolution;
}
export type RecursivePrivateBulkUploadParams = RecursivePublicBulkUploadParams & WithDriveKey;

export interface CreatePublicFolderParams {
	folderName: string;
	driveId: DriveID;
	parentFolderId: FolderID;
}
export type CreatePrivateFolderParams = CreatePublicFolderParams & WithDriveKey;

export const skipOnConflicts = 'skip';
export const replaceOnConflicts = 'replace';
export const upsertOnConflicts = 'upsert';
// export  const askOnConflicts = 'ask';

export type FileNameConflictResolution = typeof skipOnConflicts | typeof replaceOnConflicts | typeof upsertOnConflicts;
// | typeof askOnConflicts;

export interface UploadParams {
	parentFolderId: FolderID;
	conflictResolution?: FileNameConflictResolution;
}

export interface BulkPublicUploadParams extends UploadParams {
	wrappedFolder: ArFSFolderToUpload;
	destParentFolderName?: string;
}
export type BulkPrivateUploadParams = BulkPublicUploadParams & WithDriveKey;

export interface UploadPublicFileParams extends UploadParams {
	wrappedFile: ArFSFileToUpload;
	destinationFileName?: string;
}
export type UploadPrivateFileParams = UploadPublicFileParams & WithDriveKey;

export interface CommunityTipParams {
	communityWinstonTip: Winston;
	assertBalance?: boolean;
}

interface MoveParams {
	newParentFolderId: FolderID;
}

export interface MovePublicFileParams extends MoveParams {
	fileId: FileID;
}
export type MovePrivateFileParams = MovePublicFileParams & WithDriveKey;

export interface MovePublicFolderParams extends MoveParams {
	folderId: FolderID;
}
export type MovePrivateFolderParams = MovePublicFolderParams & WithDriveKey;

export interface CreatePublicDriveParams {
	driveName: string;
}
export interface CreatePrivateDriveParams extends CreatePublicDriveParams {
	newPrivateDriveData: PrivateDriveKeyData;
}

interface GetEntityParams {
	owner?: ArweaveAddress;
}
export interface GetPublicDriveParams extends GetEntityParams {
	driveId: DriveID;
}
export type GetPrivateDriveParams = GetPublicDriveParams & WithDriveKey;

export interface GetPublicFolderParams extends GetEntityParams {
	folderId: FolderID;
}
export type GetPrivateFolderParams = GetPublicFolderParams & WithDriveKey;

export interface GetPublicFileParams extends GetEntityParams {
	fileId: FileID;
}
export type GetPrivateFileParams = GetPublicFileParams & WithDriveKey;

export interface GetAllDrivesForAddressParams {
	address: ArweaveAddress;
	privateKeyData: PrivateKeyData;
}

export interface CipherIVQueryResult {
	txId: TransactionID;
	cipherIV: CipherIV;
}
