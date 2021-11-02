import prompts from 'prompts';
import { FileNameConflictAskPrompt, renameOnConflicts, replaceOnConflicts, skipOnConflicts } from './ardrive';

export const fileNameConflictAskPrompt: FileNameConflictAskPrompt = async ({
	fileId,
	fileName,
	hasSameLastModifiedDate
}) => {
	const { resolution } = await prompts({
		type: 'select',
		name: 'resolution',
		message: `Destination folder has a file to file name conflict!
		\nFile name: ${fileName}\nFile ID: ${fileId}\nThis file has a ${
			hasSameLastModifiedDate ? 'MATCHING' : 'DIFFERENT'
		} last modified date
		\nPlease select how to proceed:`,
		choices: [
			{ title: 'Replace as new revision', value: replaceOnConflicts },
			{ title: 'Upload with a different file name', value: renameOnConflicts },
			{ title: 'Skip upload', value: skipOnConflicts }
		]
	});

	if (resolution === skipOnConflicts) {
		return { resolution: skipOnConflicts };
	}

	if (resolution === replaceOnConflicts) {
		return { resolution: replaceOnConflicts };
	}

	if (resolution === renameOnConflicts) {
		const { newFileName } = await prompts({
			type: 'text',
			name: 'newFileName',
			message: 'Enter new file name'
		});

		return { resolution: renameOnConflicts, newFileName };
	}

	throw new Error('File name conflict prompt was interrupted or could not be resolved!');
};
