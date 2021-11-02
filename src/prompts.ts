import prompts from 'prompts';
import { FileNameConflictAskPrompt } from './ardrive';

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
			{ title: 'Replace as new revision', value: 'replace' },
			{ title: 'Upload with a different file name', value: 'rename' },
			{ title: 'Skip upload', value: 'skip' }
		]
	});

	if (resolution === 'skip') {
		return { resolution: 'skip' };
	}

	if (resolution === 'replace') {
		return { resolution: 'replace' };
	}

	if (resolution === 'rename') {
		const { newFileName } = await prompts({
			type: 'text',
			name: 'newFileName',
			message: 'Enter new file name'
		});

		return { resolution: 'rename', newFileName };
	}

	throw new Error('File name conflict prompt was interrupted or could not be resolved!');
};
