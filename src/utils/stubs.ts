import {
	ArFSPublicDrive,
	ArFSPrivateDrive,
	ArFSPublicFolder,
	ArFSPrivateFolder,
	ArFSPublicFile,
	ArFSPrivateFile
} from '../arfs_entities';
import { ArFS_O_11, EntityID } from '../types';

export const stubArweaveAddress = 'abcdefghijklmnopqrxtuvwxyz123456789ABCDEFGH';
export const stubTransactionID = '0000000000000000000000000000000000000000000';
export const stubEntityID = (alternate = false): EntityID => `00000000-0000-0000-0000-00000000000${alternate ? 1 : 0}`;

export const stubPublicDrive = new ArFSPublicDrive(
	'Integration Test',
	'1.0',
	ArFS_O_11,
	'application/json',
	stubEntityID(),
	'drive',
	'STUB DRIVE',
	stubTransactionID,
	0,
	'public',
	stubEntityID()
);
export const stubPrivateDrive = new ArFSPrivateDrive(
	'Integration Test',
	'1.0',
	ArFS_O_11,
	'application/octet-stream',
	stubEntityID(),
	'drive',
	'STUB DRIVE',
	stubTransactionID,
	0,
	'public',
	stubEntityID(),
	'password',
	'stubCipher',
	'stubIV'
);
export const stubPublicFolder = (rootFolder = false): ArFSPublicFolder =>
	new ArFSPublicFolder(
		'Integration Test',
		'1.0',
		ArFS_O_11,
		'application/json',
		stubEntityID(),
		'folder',
		'STUB NAME',
		stubTransactionID,
		0,
		rootFolder ? 'root folder' : stubEntityID(),
		stubEntityID()
	);

export const stubPrivateFolder = (rootFolder = false): ArFSPrivateFolder =>
	new ArFSPrivateFolder(
		'Integration Test',
		'1.0',
		ArFS_O_11,
		'application/json',
		stubEntityID(),
		'folder',
		'STUB NAME',
		stubTransactionID,
		0,
		rootFolder ? 'root folder' : stubEntityID(),
		stubEntityID(),
		'stubCipher',
		'stubIV'
	);

export const stubPublicFile = new ArFSPublicFile(
	'Integration Test',
	'1.0',
	ArFS_O_11,
	'application/json',
	stubEntityID(),
	'file',
	'STUB NAME',
	stubTransactionID,
	0,
	stubEntityID(),
	stubEntityID(),
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
	stubEntityID(),
	'file',
	'STUB NAME',
	stubTransactionID,
	0,
	stubEntityID(),
	stubEntityID(),
	1234567890,
	0,
	stubTransactionID,
	'application/json',
	'stubCipher',
	'stubIV'
);
