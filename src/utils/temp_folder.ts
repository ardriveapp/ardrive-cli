import * as fs from 'fs';
import * as os from 'os';
import path from 'path';

const isWindows = os.platform() === 'win32';

function getOrCreateTempBaseFolder(): string {
	if (isWindows) {
		return getValidWindowsTempPath() ?? getManualWindowsTempPath();
	} else {
		return getValidUnixTempPath() ?? getManualUnixTempPath();
	}
}

function getValidWindowsTempPath(): string | null {
	const envTempFolder = process.env['TEMP'] ?? process.env['TMP'];
	if (envTempFolder) {
		if (fs.existsSync(envTempFolder)) {
			return envTempFolder;
		} else {
			const userProfile = process.env['USERPROFILE'];
			if (userProfile) {
				const tempPath = path.join(userProfile, 'AppData', 'Local', 'Temp');
				if (fs.existsSync(tempPath)) {
					return tempPath;
				}
			}
		}
	}
	return null;
}

function getValidUnixTempPath(): string | null {
	const envTempFolder = process.env['TMPDIR'] ?? process.env['TMP'] ?? process.env['TEMP'];
	if (envTempFolder) {
		if (fs.existsSync(envTempFolder)) {
			return envTempFolder;
		} else {
			const tempPath = '/tmp';
			if (fs.existsSync(tempPath)) {
				return tempPath;
			}
		}
	}
	return null;
}

function getManualWindowsTempPath(): string {
	return path.join(os.homedir(), 'ardrive-temp');
}

function getManualUnixTempPath(): string {
	return path.join(os.homedir(), '.ardrive');
}

function platformTempFolder(): string {
	const tempBaseFolder = getOrCreateTempBaseFolder();
	return path.join(tempBaseFolder, 'ardrive-downloads');
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

export function cleanUpTempFolder(): void {
	const tempFolderPath = platformTempFolder();
	if (fs.existsSync(tempFolderPath)) {
		fs.rmdirSync(tempFolderPath, { recursive: true });
	}
}
