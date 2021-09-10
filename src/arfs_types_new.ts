/*

// The primary ArFS entity that all other entities inherit from.
export class ArFSEntity {
	appName: string; // The app that has submitted this entity.  Should not be longer than 64 characters.  eg. ArDrive-Web
	appVersion: string; // The app version that has submitted this entity.  Must not be longer than 8 digits, numbers only. eg. 0.1.14
	arFS: string; // The version of Arweave File System that is used for this entity.  Must not be longer than 4 digits. eg 0.11
	contentType: string; // the mime type of the file uploaded.  in the case of drives and folders, it is always a JSON file.  Public drive/folders must use "application/json" and private drives use "application/octet-stream" since this data is encrypted.
	driveId: string; // the unique drive identifier, created with uuidv4 https://www.npmjs.com/package/uuidv4 eg. 41800747-a852-4dc9-9078-6c20f85c0f3a
	entityType: string; // the type of ArFS entity this is.  this can only be set to "drive", "folder", "file"
	name: string; // user defined entity name, cannot be longer than 64 characters.  This is stored in the JSON file that is uploaded along with the drive/folder/file metadata transaction
	syncStatus: number; // the status of this transaction.  0 = 'ready to download', 1 = 'ready to upload', 2 = 'getting mined', 3 = 'successfully uploaded'
	txId: string; // the arweave transaction id for this entity. 43 numbers/letters eg. 1xRhN90Mu5mEgyyrmnzKgZP0y3aK8AwSucwlCOAwsaI
	unixTime: number; // seconds since unix epoch, taken at the time of upload, 10 numbers eg. 1620068042

	constructor(
		appName: string,
		appVersion: string,
		arFS: string,
		contentType: string,
		driveId: string,
		entityType: string,
		name: string,
		syncStatus: number,
		txId: string,
		unixTime: number
	) {
		this.appName = appName;
		this.appVersion = appVersion;
		this.arFS = arFS;
		this.contentType = contentType;
		this.driveId = driveId;
		this.entityType = entityType;
		this.name = name;
		this.syncStatus = syncStatus;
		this.txId = txId;
		this.unixTime = unixTime;
	}
}

// A Drive is a logical grouping of folders and files. All folders and files must be part of a drive, and reference the Drive ID.
// When creating a Drive, a corresponding folder must be created as well. This folder will act as the Drive Root Folder.
// This seperation of drive and folder entity enables features such as folder view queries.
export interface ArFSDriveEntity extends ArFSEntity {
	drivePrivacy: string; // identifies if this drive is public or private (and encrypted)  can only be "public" or "private"
	rootFolderId: string; // the uuid of the related drive root folder, stored in the JSON data that is uploaded with each Drive Entity metadata transaction
}

// An entity for a Private Drive entity with the extra privacy tags
export interface ArFSPrivateDriveEntity extends ArFSDriveEntity {
	driveAuthMode: string; // used for future authentication schemes.  the only allowable value is "password"
	cipher: string; // The ArFS Cipher used.  Only available cipher is AES256-GCM
	cipherIV: string; // The cipher initialization vector used for encryption, 12 bytes as base 64, 16 characters. eg YJxNOmlg0RWuMHij
}

// A Folder is a logical group of folders and files.  It contains a parent folder ID used to reference where this folder lives in the Drive hierarchy.
// Drive Root Folders must not have a parent folder ID, as they sit at the root of a drive.
// A File contains actual data, like a photo, document or movie.
// The File metadata transaction JSON references the File data transaction for retrieval.
// This separation allows for file metadata to be updated without requiring the file data to be reuploaded.
// Files and Folders leverage the same entity type since they have the same properties
export interface ArFSFileFolderEntity extends ArFSEntity {
	parentFolderId: string; // the uuid of the parent folder that this entity sits within.  Folder Entities used for the drive root must not have a parent folder ID, eg. 41800747-a852-4dc9-9078-6c20f85c0f3a
	entityId: string; // the unique folder identifier, created with uuidv4 https://www.npmjs.com/package/uuidv4 eg. 41800747-a852-4dc9-9078-6c20f85c0f3a
	lastModifiedDate: number; // the last modified date of the file or folder as seconds since unix epoch
}

// Used for private Files/Folders only.
export interface ArFSPrivateFileFolderEntity extends ArFSFileFolderEntity {
	cipher: string; // The ArFS Cipher used.  Only available cipher is AES256-GCM
	cipherIV: string; // The cipher initialization vector used for encryption, 12 bytes as base 64, 16 characters. eg YJxNOmlg0RWuMHij
}

// File entity metadata transactions do not include the actual File data they represent.
// Instead, the File data must be uploaded as a separate transaction, called the File data transaction.
export class ArFSFileData {
	appName: string; // The app that has submitted this entity
	appVersion: string; // The app version that has submitted this entity
	contentType: string; // the mime type of the file uploaded.  Could be any file/mime type: https://www.freeformatter.com/mime-types-list.html
	syncStatus: number; // the status of this transaction.  0 = 'ready to download', 1 = 'ready to upload', 2 = 'getting mined', 3 = 'successfully uploaded'
	txId: string; // the arweave transaction id for this file data. 43 numbers/letters eg. 1xRhN90Mu5mEgyyrmnzKgZP0y3aK8AwSucwlCOAwsaI
	unixTime: number; // seconds since unix epoch, taken at the time of upload, 10 numbers eg. 1620068042
	constructor(
		appName: string,
		appVersion: string,
		contentType: string,
		syncStatus: number,
		txId: string,
		unixTime: number
	) {
		this.appName = appName;
		this.appVersion = appVersion;
		this.contentType = contentType;
		this.syncStatus = syncStatus;
		this.txId = txId;
		this.unixTime = unixTime;
	}
}

// Used for private file data only
export class ArFSPrivateFileData extends ArFSFileData {
	cipher: string; // The ArFS Cipher used.  Only available cipher is AES256-GCM
	cipherIV: string; // The cipher initialization vector used for encryption, 12 bytes as base 64, 16 characters. eg cipher:string,YJxNOmlg0RWuMHijcipher: string

	constructor(
		appName: string,
		appVersion: string,
		contentType: string,
		syncStatus: number,
		txId: string,
		unixTime: number,
		cipher: string,
		cipherIV: string
	) {
		super(appName, appVersion, contentType, syncStatus, txId, unixTime);
		this.cipher = cipher;
		this.cipherIV = cipherIV;
	}
}

*/
