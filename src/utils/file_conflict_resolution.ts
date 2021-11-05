import {
	skipOnConflicts,
	replaceOnConflicts,
	upsertOnConflicts,
	askOnConflicts,
	renameOnConflicts,
	FileID,
	FileNameConflictResolution
} from '../types';
import { FileConflictInfo } from './mapper_functions';

export type FileNameConflictAskPrompt = (params: {
	fileName: string;
	fileId: FileID;
	hasSameLastModifiedDate: boolean;
}) => Promise<
	| { resolution: typeof skipOnConflicts | typeof replaceOnConflicts }
	| { resolution: typeof renameOnConflicts; newFileName: string }
>;

type FileConflictResolution = (params: {
	conflictResolution: FileNameConflictResolution;
	conflictingFileInfo: FileConflictInfo;
	hasSameLastModifiedDate: boolean;
	fileNameConflictAskPrompt?: FileNameConflictAskPrompt;
}) => Promise<{ existingFileId?: FileID; newFileName?: string } | typeof skipOnConflicts>;

export const fileConflictResolution: FileConflictResolution = async ({
	conflictResolution,
	conflictingFileInfo,
	hasSameLastModifiedDate,
	fileNameConflictAskPrompt
}) => {
	switch (conflictResolution) {
		case skipOnConflicts:
			// File has the same name, skip the upload
			return skipOnConflicts;

		case replaceOnConflicts:
			// Proceed with new revision
			return { existingFileId: conflictingFileInfo.fileId };

		case upsertOnConflicts:
			if (hasSameLastModifiedDate) {
				// These files have the same name and last modified date, skip the upload
				return skipOnConflicts;
			}
			// Otherwise, proceed with creating a new revision
			return { existingFileId: conflictingFileInfo.fileId };

		case askOnConflicts: {
			if (!fileNameConflictAskPrompt) {
				throw new Error(
					'App must provide a file name conflict resolution prompt to use the `ask` conflict resolution!'
				);
			}

			const userInput = await fileNameConflictAskPrompt({
				fileName: conflictingFileInfo.fileName,
				fileId: conflictingFileInfo.fileId,
				hasSameLastModifiedDate
			});

			switch (userInput.resolution) {
				case skipOnConflicts:
					return skipOnConflicts;

				case renameOnConflicts:
					if (conflictingFileInfo.fileName === userInput.newFileName) {
						throw new Error('You must provide a different name!');
					}
					// Use specified new file name
					return { newFileName: userInput.newFileName };

				case replaceOnConflicts:
					// Proceed with new revision
					return { existingFileId: conflictingFileInfo.fileId };
			}
		}
	}
};
