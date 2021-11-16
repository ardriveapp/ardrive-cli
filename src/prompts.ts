import prompts from 'prompts';
import {
	FileConflictPrompts,
	FileToFileNameConflictPrompt,
	FileToFolderConflictAskPrompt,
	FolderConflictPrompts,
	FolderToFileConflictAskPrompt,
	FolderToFolderConflictAskPrompt,
	renameOnConflicts,
	replaceOnConflicts,
	skipOnConflicts,
	useExistingFolder
} from './utils/upload_conflict_resolution';

export const fileToFileNameConflict: FileToFileNameConflictPrompt = async ({
	fileId,
	fileName,
	hasSameLastModifiedDate,
	namesWithinDestFolder: namesWithinFolder
}) => {
	const { resolution } = await prompts({
		type: 'select',
		name: 'resolution',
		message: `\nDestination folder has a file to file name conflict!
		\nFile name: ${fileName}\nFile ID: ${fileId}\nThis file has a ${
			hasSameLastModifiedDate ? 'MATCHING' : 'DIFFERENT'
		} last modified date
		\nPlease select how to proceed:\n`,
		choices: [promptChoices.replaceAsRevision, promptChoices.uploadFileWithNewName, promptChoices.skipFileUpload]
	});

	if (resolution === skipOnConflicts) {
		return { resolution: skipOnConflicts };
	}

	if (resolution === replaceOnConflicts) {
		return { resolution: replaceOnConflicts };
	}

	if (resolution === renameOnConflicts) {
		let newFileName: string | undefined = undefined;

		while (!newFileName) {
			const { newFileName: fileNameFromPrompt } = await fileNamePrompt();

			// Repeat the prompt if name is unchanged or conflicts with another name
			if (fileNameFromPrompt !== fileName && !namesWithinFolder.includes(fileNameFromPrompt)) {
				newFileName = fileNameFromPrompt;
			}
		}

		return { resolution: renameOnConflicts, newFileName };
	}

	throw new Error(conflictInterruptedError);
};

export const fileToFolderNameConflict: FileToFolderConflictAskPrompt = async ({
	folderId,
	folderName,
	namesWithinDestFolder: namesWithinFolder
}) => {
	const { resolution } = await prompts({
		type: 'select',
		name: 'resolution',
		message: `\nDestination folder has a file to folder name conflict!
		\nFolder name: ${folderName}\nFolderID: ${folderId}
		\nPlease select how to proceed:\n`,
		choices: [promptChoices.uploadFileWithNewName, promptChoices.skipFileUpload]
	});

	if (resolution === skipOnConflicts) {
		return { resolution: skipOnConflicts };
	}

	if (resolution === renameOnConflicts) {
		let newFileName: string | undefined = undefined;

		while (!newFileName) {
			const { newFileName: fileNameFromPrompt } = await fileNamePrompt();

			// Repeat the prompt if name is unchanged or conflicts with another name
			if (fileNameFromPrompt !== folderName && !namesWithinFolder.includes(fileNameFromPrompt)) {
				newFileName = fileNameFromPrompt;
			}
		}

		return { resolution: renameOnConflicts, newFileName };
	}

	throw new Error(conflictInterruptedError);
};

export const folderToFileNameConflict: FolderToFileConflictAskPrompt = async ({
	fileId,
	fileName,
	namesWithinDestFolder: namesWithinFolder
}) => {
	const { resolution } = await prompts({
		type: 'select',
		name: 'resolution',
		message: `\nDestination folder has a folder to file name conflict!
		\nFile name: ${fileName}\nFile ID: ${fileId}
		\nPlease select how to proceed:\n`,
		choices: [promptChoices.createFolderWithNewName, promptChoices.skipFolderAndContents]
	});

	if (resolution === skipOnConflicts) {
		return { resolution: skipOnConflicts };
	}

	if (resolution === renameOnConflicts) {
		let newFolderName: string | undefined = undefined;

		while (!newFolderName) {
			const { newFolderName: folderNameFromPrompt } = await folderNamePrompt();

			// Repeat the prompt if name is unchanged or conflicts with another name
			if (folderNameFromPrompt !== fileName && !namesWithinFolder.includes(folderNameFromPrompt)) {
				newFolderName = folderNameFromPrompt;
			}
		}

		return { resolution: renameOnConflicts, newFolderName };
	}

	throw new Error(conflictInterruptedError);
};

export const folderToFolderNameConflict: FolderToFolderConflictAskPrompt = async ({
	folderId,
	folderName,
	namesWithinDestFolder: namesWithinFolder
}) => {
	const { resolution } = await prompts({
		type: 'select',
		name: 'resolution',
		message: `\nDestination folder has a folder to folder name conflict!
		\nFolder name: ${folderName}\nFolder ID: ${folderId}
		\nPlease select how to proceed:\n`,
		choices: [
			promptChoices.useExistingFolder,
			promptChoices.createFolderWithNewName,
			promptChoices.skipFolderAndContents
		]
	});

	if (resolution === skipOnConflicts) {
		return { resolution: skipOnConflicts };
	}

	if (resolution === useExistingFolder) {
		return { resolution: useExistingFolder };
	}

	if (resolution === renameOnConflicts) {
		let newFolderName: string | undefined = undefined;

		while (!newFolderName) {
			const { newFolderName: folderNameFromPrompt } = await folderNamePrompt();

			// Repeat the prompt if name is unchanged or conflicts with another name
			if (folderNameFromPrompt !== folderName && !namesWithinFolder.includes(folderNameFromPrompt)) {
				newFolderName = folderNameFromPrompt;
			}
		}

		return { resolution: renameOnConflicts, newFolderName };
	}

	throw new Error(conflictInterruptedError);
};

const conflictInterruptedError = 'Name conflict prompt was interrupted or could not be resolved!';

const fileNamePrompt = () =>
	prompts({
		type: 'text',
		name: 'newFileName',
		message: 'Enter new file name'
	});

const folderNamePrompt = () =>
	prompts({
		type: 'text',
		name: 'newFolderName',
		message: 'Enter new folder name'
	});

const promptChoices = {
	useExistingFolder: { title: 'Re-use existing folder', value: useExistingFolder },
	createFolderWithNewName: { title: 'Create folder with a different name', value: renameOnConflicts },
	uploadFileWithNewName: { title: 'Upload with a different file name', value: renameOnConflicts },
	skipFolderAndContents: { title: 'Skip uploading folder and all of its contents', value: skipOnConflicts },
	skipFileUpload: { title: 'Skip this file upload', value: skipOnConflicts },
	replaceAsRevision: { title: 'Replace as new file revision', value: replaceOnConflicts }
};

export const fileUploadConflictPrompts: FileConflictPrompts = {
	fileToFileNameConflict,
	fileToFolderNameConflict
};

export const folderUploadConflictPrompts: FolderConflictPrompts = {
	...fileUploadConflictPrompts,
	folderToFolderNameConflict,
	folderToFileNameConflict
};
