import * as fs from 'fs';
import { extToMime } from 'ardrive-core-js';
import { basename, join } from 'path';
import { ByteCount, DataContentType, FileID, FolderID, UnixTime } from './types';
import { BulkFileBaseCosts, MetaDataBaseCosts } from './ardrive';
import { EntityNamesAndIds } from './utils/mapper_functions';

type BaseFileName = string;
type FilePath = string;

/**
 *  Fs + Node implementation file size limitations -- tested on MacOS Sep 27, 2021
 *
 *  Public : 2147483647 bytes
 *  Private: 2147483646 bytes
 */
const maxFileSize: ByteCount = 2147483646;

export interface FileInfo {
	dataContentType: DataContentType;
	lastModifiedDateMS: UnixTime;
	fileSize: ByteCount;
}

/**
 * Reads stats of a file or folder  and constructs a File or Folder wrapper class
 *
 * @remarks import and use `isFolder` type-guard to later determine whether a folder or file
 *
 * @example
 *
 * const fileOrFolder = wrapFileOrFolder(myFilePath);
 *
 * if (isFolder(fileOrFolder)) {
 * 	// Type is: Folder
 * } else {
 * 	// Type is: File
 * }
 *
 */
export function wrapFileOrFolder(fileOrFolderPath: FilePath): ArFSFileToUpload | ArFSFolderToUpload {
	const entityStats = fs.statSync(fileOrFolderPath);

	if (entityStats.isDirectory()) {
		return new ArFSFolderToUpload(fileOrFolderPath, entityStats);
	}

	return new ArFSFileToUpload(fileOrFolderPath, entityStats);
}

/** Type-guard function to determine if returned class is a File or Folder */
export function isFolder(fileOrFolder: ArFSFileToUpload | ArFSFolderToUpload): fileOrFolder is ArFSFolderToUpload {
	return fileOrFolder instanceof ArFSFolderToUpload;
}

export class ArFSFileToUpload {
	constructor(public readonly filePath: FilePath, public readonly fileStats: fs.Stats) {
		if (this.fileStats.size >= maxFileSize) {
			throw new Error(`Files greater than "${maxFileSize}" bytes are not yet supported!`);
		}
	}

	baseCosts?: BulkFileBaseCosts;
	existingId?: FileID;
	existingFolderAtDestConflict = false;
	hasSameLastModifiedDate = false;

	public gatherFileInfo(): FileInfo {
		const dataContentType = this.getContentType();
		const lastModifiedDateMS = this.lastModifiedDate;
		const fileSize = this.fileStats.size;

		return { dataContentType, lastModifiedDateMS, fileSize };
	}

	public get lastModifiedDate(): UnixTime {
		return Math.floor(this.fileStats.mtimeMs);
	}

	public getBaseCosts(): BulkFileBaseCosts {
		if (!this.baseCosts) {
			throw new Error('Base costs on file were never set!');
		}
		return this.baseCosts;
	}

	public getFileDataBuffer(): Buffer {
		return fs.readFileSync(this.filePath);
	}

	public getContentType(): DataContentType {
		return extToMime(this.filePath);
	}

	public getBaseFileName(): BaseFileName {
		return basename(this.filePath);
	}

	/** Computes the size of a private file encrypted with AES256-GCM */
	public encryptedDataSize(): ByteCount {
		return (this.fileStats.size / 16 + 1) * 16;
	}
}

export class ArFSFolderToUpload {
	files: ArFSFileToUpload[] = [];
	folders: ArFSFolderToUpload[] = [];

	baseCosts?: MetaDataBaseCosts;
	existingId?: FolderID;
	destinationName?: string;
	existingFileAtDestConflict = false;

	constructor(public readonly filePath: FilePath, public readonly fileStats: fs.Stats) {
		const entitiesInFolder = fs.readdirSync(this.filePath);

		for (const entityPath of entitiesInFolder) {
			const absoluteEntityPath = join(this.filePath, entityPath);
			const entityStats = fs.statSync(absoluteEntityPath);

			if (entityStats.isDirectory()) {
				// Child is a folder, build a new folder which will construct it's own children
				const childFolder = new ArFSFolderToUpload(absoluteEntityPath, entityStats);
				this.folders.push(childFolder);
			} else {
				// Child is a file, build a new file
				const childFile = new ArFSFileToUpload(absoluteEntityPath, entityStats);
				this.files.push(childFile);
			}
		}
	}

	public async checkAndAssignExistingNames(
		getExistingNamesFn: (parentFolderId: FolderID) => Promise<EntityNamesAndIds>
	): Promise<void> {
		if (!this.existingId) {
			// Folder has no existing ID to check
			return;
		}

		const existingEntityNamesAndIds = await getExistingNamesFn(this.existingId);

		for await (const file of this.files) {
			const baseFileName = file.getBaseFileName();

			const existingFolderAtDestConflict = existingEntityNamesAndIds.folders.find(
				({ folderName }) => folderName === baseFileName
			);

			if (existingFolderAtDestConflict) {
				// Folder name cannot conflict with a file name
				file.existingFolderAtDestConflict = true;
				continue;
			}

			const existingFileAtDestConflict = existingEntityNamesAndIds.files.find(
				({ fileName }) => fileName === baseFileName
			);

			// Conflicting file name creates a REVISION by default
			if (existingFileAtDestConflict) {
				file.existingId = existingFileAtDestConflict.fileId;

				if (existingFileAtDestConflict.lastModifiedDate === file.lastModifiedDate) {
					// Check last modified date and set to true to resolve upsert conditional
					file.hasSameLastModifiedDate = true;
				}
			}
		}

		for await (const folder of this.folders) {
			const baseFolderName = folder.getBaseFileName();

			const existingFileAtDestConflict = existingEntityNamesAndIds.files.find(
				({ fileName }) => fileName === baseFolderName
			);

			if (existingFileAtDestConflict) {
				// Folder name cannot conflict with a file name
				this.existingFileAtDestConflict = true;
				continue;
			}

			const existingFolderAtDestConflict = existingEntityNamesAndIds.folders.find(
				({ folderName }) => folderName === baseFolderName
			);

			// Conflicting folder name uses EXISTING folder by default
			if (existingFolderAtDestConflict) {
				// Assigns existing id for later use
				folder.existingId = existingFolderAtDestConflict.folderId;

				// Recurse into existing folder on folder name conflict
				await folder.checkAndAssignExistingNames(getExistingNamesFn);
			}
		}
	}

	public getBaseCosts(): MetaDataBaseCosts {
		if (!this.baseCosts) {
			throw new Error('Base costs on folder were never set!');
		}
		return this.baseCosts;
	}

	public getBaseFileName(): BaseFileName {
		return basename(this.filePath);
	}

	getTotalByteCount(encrypted = false): ByteCount {
		let totalByteCount = 0;

		for (const file of this.files) {
			totalByteCount += encrypted ? file.encryptedDataSize() : file.fileStats.size;
		}
		for (const folder of this.folders) {
			totalByteCount += folder.getTotalByteCount(encrypted);
		}

		return totalByteCount;
	}
}
