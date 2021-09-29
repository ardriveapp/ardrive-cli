import * as fs from 'fs';
import { extToMime } from 'ardrive-core-js';
import { basename, join } from 'path';
import { Bytes } from './types';
import { FileUploadBaseCosts, FolderUploadBaseCosts } from './ardrive';

type ContentType = string;
type BaseFileName = string;
type FilePath = string;

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
export function wrapFileOrFolder(fileOrFolderPath: FilePath): FsFile | FsFolder {
	const entityStats = fs.statSync(fileOrFolderPath);

	if (entityStats.isDirectory()) {
		return new FsFolder(fileOrFolderPath, entityStats);
	}

	return new FsFile(fileOrFolderPath, entityStats);
}

/** Type-guard function to determine if returned class is a File or Folder */
export function isFolder(fileOrFolder: FsFile | FsFolder): fileOrFolder is FsFolder {
	return Object.keys(fileOrFolder).includes('files') || Object.keys(fileOrFolder).includes('folders');
}

export class FsFile {
	constructor(public readonly filePath: FilePath, public readonly fileStats: fs.Stats) {}

	baseCosts?: FileUploadBaseCosts;

	public getBaseCosts(): FileUploadBaseCosts {
		if (!this.baseCosts) {
			throw new Error('Base costs on file were never set!');
		}
		return this.baseCosts;
	}

	public getFileDataBuffer(): Buffer {
		return fs.readFileSync(this.filePath);
	}

	public getContentType(): ContentType {
		return extToMime(this.filePath);
	}

	public getBaseFileName(): BaseFileName {
		return basename(this.filePath);
	}

	/** Computes the size of a private file encrypted with AES256-GCM */
	public encryptedDataSize(): number {
		return (this.fileStats.size / 16 + 1) * 16;
	}
}

export class FsFolder {
	files: FsFile[] = [];
	folders: FsFolder[] = [];

	baseCosts?: FolderUploadBaseCosts;

	constructor(public readonly filePath: FilePath, public readonly fileStats: fs.Stats) {
		const entitiesInFolder = fs.readdirSync(this.filePath);

		for (const entityPath of entitiesInFolder) {
			const absoluteEntityPath = join(this.filePath, entityPath);
			const entityStats = fs.statSync(absoluteEntityPath);

			if (entityStats.isDirectory()) {
				// Child is a folder, build a new folder which will construct it's own children
				const childFolder = new FsFolder(absoluteEntityPath, entityStats);
				this.folders.push(childFolder);
			} else {
				// Child is a file, build a new file
				const childFile = new FsFile(absoluteEntityPath, entityStats);
				this.files.push(childFile);
			}
		}
	}

	public getBaseCosts(): FolderUploadBaseCosts {
		if (!this.baseCosts) {
			throw new Error('Base costs on folder were never set!');
		}
		return this.baseCosts;
	}

	public getBaseFileName(): BaseFileName {
		return basename(this.filePath);
	}

	getTotalBytes(encrypted = false): Bytes {
		let totalBytes = 0;

		for (const file of this.files) {
			totalBytes += encrypted ? file.encryptedDataSize() : file.fileStats.size;
		}
		for (const folder of this.folders) {
			totalBytes += folder.getTotalBytes(encrypted);
		}

		return totalBytes;
	}
}
