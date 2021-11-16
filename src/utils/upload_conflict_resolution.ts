import { ArFSFileToUpload, ArFSFolderToUpload } from '../arfs_file_wrapper';
import { FileID, FolderID } from '../types';
import { FileConflictInfo, FolderNameAndId, NameConflictInfo } from './mapper_functions';

export const skipOnConflicts = 'skip';
export const replaceOnConflicts = 'replace';
export const upsertOnConflicts = 'upsert';
export const askOnConflicts = 'ask';

export const renameOnConflicts = 'rename';
export const useExistingFolder = 'useFolder';

/** Conflict settings used by ArDrive class */
export type FileNameConflictResolution =
	| typeof skipOnConflicts
	| typeof replaceOnConflicts
	| typeof upsertOnConflicts
	| typeof askOnConflicts;

export interface ConflictPromptParams {
	namesWithinDestFolder: string[];
}
export interface FileConflictPromptParams extends ConflictPromptParams {
	fileName: string;
	fileId: FileID;
}

export interface FileToFileConflictPromptParams extends FileConflictPromptParams {
	hasSameLastModifiedDate: boolean;
}

export interface FolderConflictPromptParams extends ConflictPromptParams {
	folderName: string;
	folderId: FolderID;
}

export type FileToFileNameConflictPrompt = (
	params: FileToFileConflictPromptParams
) => Promise<
	| { resolution: typeof skipOnConflicts | typeof replaceOnConflicts }
	| { resolution: typeof renameOnConflicts; newFileName: string }
>;

export type FileToFolderConflictAskPrompt = (
	params: FolderConflictPromptParams
) => Promise<{ resolution: typeof skipOnConflicts } | { resolution: typeof renameOnConflicts; newFileName: string }>;

export type FolderToFileConflictAskPrompt = (
	params: FileConflictPromptParams
) => Promise<{ resolution: typeof skipOnConflicts } | { resolution: typeof renameOnConflicts; newFolderName: string }>;

export type FolderToFolderConflictAskPrompt = (
	params: FolderConflictPromptParams
) => Promise<
	| { resolution: typeof skipOnConflicts | typeof useExistingFolder }
	| { resolution: typeof renameOnConflicts; newFolderName: string }
>;

export type FileConflictResolutionFnResult = { existingFileId?: FileID; newFileName?: string } | typeof skipOnConflicts;

export interface FileConflictPrompts {
	fileToFileNameConflict: FileToFileNameConflictPrompt;
	fileToFolderNameConflict: FileToFolderConflictAskPrompt;
}

export interface FolderConflictPrompts extends FileConflictPrompts {
	folderToFileNameConflict: FolderToFileConflictAskPrompt;
	folderToFolderNameConflict: FolderToFolderConflictAskPrompt;
}

export type FileConflictResolutionFn = (params: {
	conflictResolution: FileNameConflictResolution;
	conflictingFileInfo: FileConflictInfo;
	hasSameLastModifiedDate: boolean;
	prompts?: FileConflictPrompts;
	namesWithinDestFolder: string[];
}) => Promise<FileConflictResolutionFnResult>;

interface ResolveNameConflictsParams {
	conflictResolution: FileNameConflictResolution;
	nameConflictInfo: NameConflictInfo;
}

interface ResolveFileNameConflictsParams extends ResolveNameConflictsParams {
	destinationFileName: string;
	wrappedFile: ArFSFileToUpload;
	prompts?: FileConflictPrompts;
}

interface ResolveFolderNameConflictsParams extends ResolveNameConflictsParams {
	destinationFolderName: string;
	wrappedFolder: ArFSFolderToUpload;
	getConflictInfoFn: (parentFolderId: FolderID) => Promise<NameConflictInfo>;
	prompts?: FolderConflictPrompts;
}

export const resolveFileNameConflicts = async (params: ResolveFileNameConflictsParams): Promise<void> => {
	const { wrappedFile, conflictResolution, destinationFileName: destFileName, nameConflictInfo, prompts } = params;

	const existingNameAtDestConflict = checkNameInfoForConflicts(destFileName, nameConflictInfo);

	if (!existingNameAtDestConflict.existingFileConflict && !existingNameAtDestConflict.existingFolderConflict) {
		// There are no conflicts, continue file upload
		return;
	}

	const hasSameLastModifiedDate =
		existingNameAtDestConflict.existingFileConflict?.lastModifiedDate === wrappedFile.lastModifiedDate;

	if (conflictResolution !== askOnConflicts) {
		if (existingNameAtDestConflict.existingFolderConflict || conflictResolution === skipOnConflicts) {
			// Skip this file
			wrappedFile.skipThisUpload = true;
			return;
		}

		if (conflictResolution === replaceOnConflicts) {
			// Proceed with new revision
			wrappedFile.existingId = existingNameAtDestConflict.existingFileConflict.fileId;
			return;
		}

		// Otherwise, default to upsert behavior
		if (hasSameLastModifiedDate) {
			// Skip this file, it has a matching last modified date
			wrappedFile.skipThisUpload = true;
			return;
		}
		// Proceed with creating a new revision
		wrappedFile.existingId = existingNameAtDestConflict.existingFileConflict.fileId;
		return;
	}

	// Use the ask prompt behavior
	if (!prompts) {
		throw new Error(
			'App must provide a file name conflict resolution prompt to use the `ask` conflict resolution!'
		);
	}

	const allExistingNames = [
		...nameConflictInfo.files.map((f) => f.fileName),
		...nameConflictInfo.folders.map((f) => f.folderName)
	];

	const userInput = await (() => {
		if (existingNameAtDestConflict.existingFolderConflict) {
			return prompts.fileToFolderNameConflict({
				folderId: existingNameAtDestConflict.existingFolderConflict.folderId,
				folderName: destFileName,
				namesWithinDestFolder: allExistingNames
			});
		}

		return prompts.fileToFileNameConflict({
			fileId: existingNameAtDestConflict.existingFileConflict.fileId,
			fileName: destFileName,
			hasSameLastModifiedDate,
			namesWithinDestFolder: allExistingNames
		});
	})();

	switch (userInput.resolution) {
		case skipOnConflicts:
			// Skip this file
			wrappedFile.skipThisUpload = true;
			return;

		case renameOnConflicts:
			// These cases should be handled at the app level, but throw errors here if not
			if (destFileName === userInput.newFileName) {
				throw new Error('You must provide a different name!');
			}
			if (allExistingNames.includes(userInput.newFileName)) {
				throw new Error('That name also exists within dest folder!');
			}

			// Use specified new file name
			wrappedFile.newFileName = userInput.newFileName;
			return;

		case replaceOnConflicts:
			// Proceed with new revision
			wrappedFile.existingId = existingNameAtDestConflict.existingFileConflict?.fileId;
			return;
	}
};

export const resolveFolderNameConflicts = async ({
	wrappedFolder,
	nameConflictInfo,
	destinationFolderName: destFolderName,
	prompts,
	conflictResolution,
	getConflictInfoFn
}: ResolveFolderNameConflictsParams): Promise<void> => {
	const existingNameAtDestConflict = checkNameInfoForConflicts(destFolderName, nameConflictInfo);

	if (!existingNameAtDestConflict.existingFileConflict && !existingNameAtDestConflict.existingFolderConflict) {
		// There are no conflicts, continue folder upload
		return;
	}

	if (conflictResolution !== askOnConflicts) {
		if (existingNameAtDestConflict.existingFileConflict) {
			// Folders cannot overwrite files
			// Skip this folder and all its contents
			wrappedFolder.skipThisUpload = true;
			return;
		}
		// Re-use this folder, upload its contents within the existing folder
		wrappedFolder.existingId = existingNameAtDestConflict.existingFolderConflict.folderId;
	} else {
		// Use the ask prompt behavior
		if (!prompts) {
			throw new Error('App must provide name conflict resolution prompts to use the `ask` conflict resolution!');
		}

		const allExistingNames = [
			...nameConflictInfo.files.map((f) => f.fileName),
			...nameConflictInfo.folders.map((f) => f.folderName)
		];

		const userInput = await (() => {
			if (existingNameAtDestConflict.existingFolderConflict) {
				return prompts.folderToFolderNameConflict({
					folderId: existingNameAtDestConflict.existingFolderConflict.folderId,
					folderName: destFolderName,
					namesWithinDestFolder: allExistingNames
				});
			}

			return prompts.folderToFileNameConflict({
				fileId: existingNameAtDestConflict.existingFileConflict.fileId,
				fileName: destFolderName,
				namesWithinDestFolder: allExistingNames
			});
		})();

		switch (userInput.resolution) {
			case skipOnConflicts:
				// Skip this folder and all its contents
				wrappedFolder.skipThisUpload = true;
				return;

			case useExistingFolder:
				if (!existingNameAtDestConflict.existingFolderConflict) {
					// useExistingFolder will only ever be returned from a folderToFolder prompt, which
					// WILL have existingFolderConflict -- this error should never happen
					throw new Error('Cannot use existing folder id of non existent folder...');
				}

				// Re-use this folder, upload its contents within the existing folder
				wrappedFolder.existingId = existingNameAtDestConflict.existingFolderConflict.folderId;

				// Break to check conflicts within folder
				break;

			case renameOnConflicts:
				// These cases should be handled at the app level, but throw errors here if not
				if (destFolderName === userInput.newFolderName) {
					throw new Error('You must provide a different name!');
				}
				if (allExistingNames.includes(userInput.newFolderName)) {
					throw new Error('That name also exists within dest folder!');
				}

				// Use new folder name and upload all contents within new folder
				wrappedFolder.newFolderName = userInput.newFolderName;

				// Conflict resolved by rename -- return early, do NOT recurse into this folder
				return;
		}
	}

	if (wrappedFolder.existingId) {
		// Re-using existing folder id, check for name conflicts inside the folder
		const childConflictInfo = await getConflictInfoFn(wrappedFolder.existingId);

		for await (const file of wrappedFolder.files) {
			// Check each file upload within the folder for name conflicts
			await resolveFileNameConflicts({
				wrappedFile: file,
				conflictResolution,
				destinationFileName: file.getBaseFileName(),
				nameConflictInfo: childConflictInfo,
				prompts
			});
		}

		for await (const folder of wrappedFolder.folders) {
			// Recurse into each folder to check for more name conflicts
			await resolveFolderNameConflicts({
				wrappedFolder: folder,
				conflictResolution,
				getConflictInfoFn,
				destinationFolderName: folder.getBaseFileName(),
				nameConflictInfo: childConflictInfo,
				prompts
			});
		}
	}
};

/**
 * Utility function for finding name conflicts within NameConflictInfo
 * Returns a union of objects to be safely used in type narrowing
 */
function checkNameInfoForConflicts(
	destinationName: string,
	nameConflictInfo: NameConflictInfo
):
	| { existingFolderConflict: FolderNameAndId; existingFileConflict: undefined }
	| { existingFolderConflict: undefined; existingFileConflict: FileConflictInfo }
	| { existingFolderConflict: undefined; existingFileConflict: undefined } {
	const conflictResult = { existingFolderConflict: undefined, existingFileConflict: undefined };

	const existingFolderConflict = nameConflictInfo.folders.find((f) => f.folderName === destinationName);
	if (existingFolderConflict) {
		return { ...conflictResult, existingFolderConflict };
	}

	const existingFileConflict = nameConflictInfo.files.find((f) => f.fileName === destinationName);
	if (existingFileConflict) {
		return { ...conflictResult, existingFileConflict };
	}

	return conflictResult;
}
