import { statSync } from 'fs';
import { basename, dirname, resolve } from 'path';

export type FilePathAndName = [string, string?];

/**
 * For testing purposes.
 * This object is the default value of the last argument of getOutputFilePathAndName
 */
const fsStatSyncAndPathResolve = {
	statSync,
	resolve
};

/**
 * Resolves the path, verifies its existance and type to conditionally return its dir and file name
 * @param {string} destOutputPath - the path from where to extract the dir path and name
 * @param fsStatSyncAndPathResolveWrapper - for testing purposes it wraps the fs methods
 * @returns {FilePathAndName} - the directory where to put the file and the file name (which is undefined when the provided destOutputPath is a directory)
 */
export function getOutputFolderPathAndName(
	destOutputPath: string,
	fsStatSyncAndPathResolveWrapper = fsStatSyncAndPathResolve
): FilePathAndName {
	const resolvedOutputPath = fsStatSyncAndPathResolveWrapper.resolve(destOutputPath);
	const outputDirname = dirname(resolvedOutputPath);
	const outputBasename = basename(resolvedOutputPath);
	try {
		const outputPathStats = fsStatSyncAndPathResolveWrapper.statSync(resolvedOutputPath);
		// the destination does exist
		if (outputPathStats.isDirectory()) {
			// TODO: check case sensitivity conflicts here
			// and is a directory
			return [resolvedOutputPath];
		}
	} catch (e) {
		// the destination doesn't exist
		const outputParentPathStats = fsStatSyncAndPathResolveWrapper.statSync(outputDirname);
		// the parent exists
		if (outputParentPathStats.isDirectory()) {
			return [outputDirname, outputBasename];
		}
		// TODO: handle the recoverable error case for `ENAMETOOLONG`
		throw new Error("The destination path doesn't exist"); // TODO: suggest to use the `--create-parents` flag
	}
	throw new Error(`The destination isn't a folder!`);
}
