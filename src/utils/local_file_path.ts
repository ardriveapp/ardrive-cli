import { statSync } from 'fs';
import { basename, dirname, resolve } from 'path';

export type FilePathAndName = [string, string?];

export function getOutputFilePathAndName(destOutputPath: string): FilePathAndName {
	const resolvedOutputPath = resolve(destOutputPath);
	const outputDirname = dirname(resolvedOutputPath);
	const outputBasename = basename(resolvedOutputPath);
	try {
		const outputPathStats = statSync(resolvedOutputPath);
		if (outputPathStats.isDirectory()) {
			return [resolvedOutputPath];
		} else if (outputPathStats.isFile()) {
			return [outputDirname, outputBasename];
		}
		throw new Error(`The destination isn't a folder nor a file!`);
	} catch (e) {
		// the destination doesn't exist
		const outputParentPathStats = statSync(outputDirname);
		// the parent exists
		if (outputParentPathStats.isDirectory()) {
			return [outputDirname, outputBasename];
		}
		throw new Error(`The path ${outputDirname} is not a directory!`);
	}
}
