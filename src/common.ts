import { exec } from 'child_process';
import os from 'os';

const LINUX_PLATFORM = 'linux';
const APPLE_PLATFORM = 'darwin';
const WINDOWS_PLATFORM = 'win32';
const UNIX_LIKE_PLATFORMS = [LINUX_PLATFORM, APPLE_PLATFORM];

export const MAX_ATTEMPTS = Infinity;
export const TOO_MANY_ATTEMPTS_ERROR = new Error('Too many attempts');

export const resolveFullPath = (relativePath: string): Promise<string> =>
	new Promise((resolve, reject) => {
		if (isUnixLikePlatform()) {
			const command = `FULL_PATH=$(readlink -e ${relativePath}); echo $(dirname $FULL_PATH)/$(basename $FULL_PATH) | sed \'r/\\/*/$//\'`;
			exec(command, (error, stdout) => {
				if (!error) {
					resolve(stdout.trim());
				} else {
					reject(new Error(`${error.message}/n${error.stack}`));
				}
			});
		} else {
			resolve(relativePath);
		}
	});

export function isUnixLikePlatform(): boolean {
	const platformId = getPlaform();
	return UNIX_LIKE_PLATFORMS.includes(platformId);
}

export function isWindowsPlatform(): boolean {
	const platformId = getPlaform();
	return WINDOWS_PLATFORM === platformId;
}

export function getPlaform(): string {
	const platformId = os.platform();
	return platformId;
}
