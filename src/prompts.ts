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
} from 'ardrive-core-js';

export const fileToFileNameConflict: FileToFileNameConflictPrompt = async ({
	fileId,
	fileName,
	hasSameLastModifiedDate,
	namesWithinDestFolder: namesWithinFolder
}) => {
	console.log(''); // Add empty line for readability
	const { resolution } = await prompts({
		type: 'select',
		name: 'resolution',
		message: `Destination folder has a file to file name conflict!
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
		const newFileName = await getNewNameFromRenamePrompt(fileName, namesWithinFolder, fileNamePrompt);

		return { resolution: renameOnConflicts, newFileName };
	}

	throw new Error(conflictInterruptedError);
};

export const fileToFolderNameConflict: FileToFolderConflictAskPrompt = async ({
	folderId,
	folderName,
	namesWithinDestFolder: namesWithinFolder
}) => {
	console.log(''); // Add empty line for readability
	const { resolution } = await prompts({
		type: 'select',
		name: 'resolution',
		message: `Destination folder has a file to folder name conflict!
		\nFolder name: ${folderName}\nFolderID: ${folderId}
		\nPlease select how to proceed:\n`,
		choices: [promptChoices.uploadFileWithNewName, promptChoices.skipFileUpload]
	});

	if (resolution === skipOnConflicts) {
		return { resolution: skipOnConflicts };
	}

	if (resolution === renameOnConflicts) {
		const newFileName = await getNewNameFromRenamePrompt(folderName, namesWithinFolder, fileNamePrompt);

		return { resolution: renameOnConflicts, newFileName };
	}

	throw new Error(conflictInterruptedError);
};

export const folderToFileNameConflict: FolderToFileConflictAskPrompt = async ({
	fileId,
	fileName,
	namesWithinDestFolder: namesWithinFolder
}) => {
	console.log(''); // Add empty line for readability
	const { resolution } = await prompts({
		type: 'select',
		name: 'resolution',
		message: `Destination folder has a folder to file name conflict!
		\nFile name: ${fileName}\nFile ID: ${fileId}
		\nPlease select how to proceed:\n`,
		choices: [promptChoices.createFolderWithNewName, promptChoices.skipFolderAndContents]
	});

	if (resolution === skipOnConflicts) {
		return { resolution: skipOnConflicts };
	}

	if (resolution === renameOnConflicts) {
		const newFolderName = await getNewNameFromRenamePrompt(fileName, namesWithinFolder, folderNamePrompt);

		return { resolution: renameOnConflicts, newFolderName };
	}

	throw new Error(conflictInterruptedError);
};

export const folderToFolderNameConflict: FolderToFolderConflictAskPrompt = async ({
	folderId,
	folderName,
	namesWithinDestFolder: namesWithinFolder
}) => {
	console.log(''); // Add empty line for readability
	const { resolution } = await prompts({
		type: 'select',
		name: 'resolution',
		message: `Destination folder has a folder to folder name conflict!
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
		const newFolderName = await getNewNameFromRenamePrompt(folderName, namesWithinFolder, folderNamePrompt);

		return { resolution: renameOnConflicts, newFolderName };
	}

	throw new Error(conflictInterruptedError);
};

const conflictInterruptedError = 'Name conflict prompt was interrupted or could not be resolved!';

const fileNamePrompt = () =>
	prompts({
		type: 'text',
		name: 'newName',
		message: 'Enter new file name'
	});

const folderNamePrompt = () =>
	prompts({
		type: 'text',
		name: 'newName',
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

/** Shared utility function to resolve and display new conflicts during rename */
export async function getNewNameFromRenamePrompt(
	conflictingName: string,
	namesWithinFolder: string[],
	prompt: () => Promise<prompts.Answers<'newName'>>
): Promise<string> {
	let nameFromRename: string | undefined = undefined;
	while (!nameFromRename) {
		const { newName } = await prompt();

		if (newName === undefined) {
			throw new Error(conflictInterruptedError);
		}

		// Repeat the prompt if name is an empty string, remains unchanged, or conflicts with another name
		if (newName === '') {
			console.log('Please enter a new name...');
			continue;
		}

		if (newName === conflictingName) {
			console.log('That is the same file name, please choose a new name!');
			continue;
		}
		if (namesWithinFolder.includes(newName)) {
			console.log('That name also conflicts with name in the destination file, choose a non-conflicting name!');
			continue;
		}

		nameFromRename = newName;
	}

	return nameFromRename;
}
