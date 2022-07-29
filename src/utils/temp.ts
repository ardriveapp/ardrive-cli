import * as fs from 'fs';
import * as os from 'os';
import path from 'path';

function platformTempFolder(): string {
	const tempBaseFolder = process.env['XDG_RUNTIME_DIR'] ?? os.homedir();
	return os.platform() === 'win32'
		? path.join(tempBaseFolder, 'ardrive-temp')
		: path.join(tempBaseFolder, '.ardrive', 'temp');
}
/**
 * Gets a folder path for storing temporary files.
 */
export function getTempFolder(): string {
	const tempFolderPath = platformTempFolder();
	if (fs.existsSync(tempFolderPath)) {
		return tempFolderPath;
	}

	fs.mkdirSync(tempFolderPath, { recursive: true });

	return tempFolderPath;
}
