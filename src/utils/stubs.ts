import {
	ArFSPublicDrive,
	ArFSPrivateDrive,
	ArFSPublicFolder,
	ArFSPrivateFolder,
	ArFSPublicFile,
	ArFSPrivateFile
} from '../arfs_entities';
import { ArFS_O_11 } from '../types';

export const stubArweaveAddress = 'abcdefghijklmnopqrxtuvwxyz123456789ABCDEFGH';
export const stubTransactionID = '0000000000000000000000000000000000000000000';

export const stubEntityID = '00000000-0000-0000-0000-000000000000';
export const stubEntityIDAlt = '00000000-0000-0000-0000-000000000001';
export const stubEntityIDAltTwo = '00000000-0000-0000-0000-000000000002';

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
	'public',
	stubEntityID,
	'password',
	'stubCipher',
	'stubIV'
);
export const stubPublicFolder = new ArFSPublicFolder(
	'Integration Test',
	'1.0',
	ArFS_O_11,
	'application/json',
	stubEntityID,
	'folder',
	'STUB NAME',
	stubTransactionID,
	0,
	stubEntityID,
	stubEntityID
);

export const stubPrivateFolder = new ArFSPrivateFolder(
	'Integration Test',
	'1.0',
	ArFS_O_11,
	'application/json',
	stubEntityID,
	'folder',
	'STUB NAME',
	stubTransactionID,
	0,
	stubEntityID,
	stubEntityID,
	'stubCipher',
	'stubIV'
);

export const stubPublicFile = new ArFSPublicFile(
	'Integration Test',
	'1.0',
	ArFS_O_11,
	'application/json',
	stubEntityID,
	'file',
	'STUB NAME',
	stubTransactionID,
	0,
	stubEntityID,
	stubEntityID,
	1234567890,
	0,
	stubTransactionID,
	'application/json'
);
export const stubPrivateFile = new ArFSPrivateFile(
	'Integration Test',
	'1.0',
	ArFS_O_11,
	'application/json',
	stubEntityID,
	'file',
	'STUB NAME',
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
