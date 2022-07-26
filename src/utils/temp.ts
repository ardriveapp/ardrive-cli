import * as fs from 'fs';
import * as os from 'os';
import path from 'path';

function platformTempFolder(): string {
	const tempBaseFolder = process.env['XDG_RUNTIME_DIR'] ?? os.homedir();
	return os.platform() === 'win32'
		? path.join(tempBaseFolder, 'ardrive-temp')
		: path.join(tempBaseFolder, '.ardrive', 'temp');
}

export async function getTempFolder(): Promise<string> {
	const tempFolderPath = await platformTempFolder();
	if (fs.existsSync(tempFolderPath)) {
		return tempFolderPath;
	}
	const folder = await fs.promises.mkdir(`${tempFolderPath}`, { recursive: true }).then((result) => {
		if (!result) {
			throw new Error('Could not create ardrive-cli temp!');
		}

		return tempFolderPath;
	});
	return folder;
}
