import {
	ArFSPublicDrive,
	ArFSPrivateDrive,
	ArFSPublicFolder,
	ArFSPrivateFolder,
	ArFSPublicFile,
	ArFSPrivateFile
} from '../arfs_entities';
import { ArweaveAddress } from '../arweave_address';
import { ArFS_O_11, DriveID, FolderID } from '../types';

export const stubArweaveAddress = (address = 'abcdefghijklmnopqrxtuvwxyz123456789ABCDEFGH'): ArweaveAddress =>
	new ArweaveAddress(address);

export const stubTransactionID = '0000000000000000000000000000000000000000000';

export const stubEntityID = '00000000-0000-0000-0000-000000000000';
export const stubEntityIDAlt = 'caa8b54a-eb5e-4134-8ae2-a3946a428ec7';

export const stubEntityIDRoot = '00000000-0000-0000-0000-000000000002';
export const stubEntityIDParent = '00000000-0000-0000-0000-000000000003';
export const stubEntityIDChild = '00000000-0000-0000-0000-000000000004';
export const stubEntityIDGrandchild = '00000000-0000-0000-0000-000000000005';

export const stubPublicDrive = new ArFSPublicDrive(
	'Integration Test',
	'1.0',
	ArFS_O_11,
	'application/json',
	stubEntityID,
	'drive',
	'STUB DRIVE',
	stubTransactionID,
	0,
	'public',
	stubEntityID
);

export const stubPrivateDrive = new ArFSPrivateDrive(
	'Integration Test',
	'1.0',
	ArFS_O_11,
	'application/octet-stream',
	stubEntityID,
	'drive',
	'STUB DRIVE',
	stubTransactionID,
	0,
	'private',
	stubEntityID,
	'password',
	'stubCipher',
	'stubIV'
);

interface StubFolderParams {
	folderId?: FolderID;
	parentFolderId?: FolderID;
	folderName?: string;
	driveId?: DriveID;
}

export const stubPublicFolder = ({
	folderId = stubEntityID,
	parentFolderId = stubEntityID,
	folderName = 'STUB NAME',
	driveId = stubEntityID
}: StubFolderParams): ArFSPublicFolder =>
	new ArFSPublicFolder(
		'Integration Test',
		'1.0',
		ArFS_O_11,
		'application/json',
		driveId,
		'folder',
		folderName,
		stubTransactionID,
		0,
		parentFolderId,
		folderId
	);

export const stubPrivateFolder = ({
	folderId = stubEntityID,
	parentFolderId = stubEntityID,
	folderName = 'STUB NAME',
	driveId = stubEntityID
}: StubFolderParams): ArFSPrivateFolder =>
	new ArFSPrivateFolder(
		'Integration Test',
		'1.0',
		ArFS_O_11,
		'application/json',
		driveId,
		'folder',
		folderName,
		stubTransactionID,
		0,
		parentFolderId,
		folderId,
		'stubCipher',
		'stubIV'
	);

interface StubFileParams {
	driveId?: DriveID;
	fileName?: string;
}

export const stubPublicFile = ({ driveId = stubEntityID, fileName = 'STUB NAME' }: StubFileParams): ArFSPublicFile =>
	new ArFSPublicFile(
		'Integration Test',
		'1.0',
		ArFS_O_11,
		'application/json',
		driveId,
		'file',
		fileName,
		stubTransactionID,
		0,
		stubEntityID,
		stubEntityID,
		1234567890,
		0,
		stubTransactionID,
		'application/json'
	);

export const stubPrivateFile = ({ driveId = stubEntityID, fileName = 'STUB NAME' }: StubFileParams): ArFSPrivateFile =>
	new ArFSPrivateFile(
		'Integration Test',
		'1.0',
		ArFS_O_11,
		'application/json',
		driveId,
		'file',
		fileName,
		stubTransactionID,
		0,
		stubEntityID,
		stubEntityID,
		1234567890,
		0,
		stubTransactionID,
		'application/json',
		'stubCipher',
		'stubIV'
	);
