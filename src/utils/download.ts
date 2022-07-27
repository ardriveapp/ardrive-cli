import * as http from 'http';
import * as https from 'https';
import * as fs from 'fs';
import path from 'path';
import { reject } from 'lodash';

/**
 * Downloads file from remote HTTP[S] host and puts its contents to the
 * specified location.
 */
export async function download(url: string, filePath: string): Promise<string | undefined> {
	const proto = !url.charAt(4).localeCompare('s') ? https : http;
	const fileName = url.split('/').pop();
	if (!fileName) {
		reject(undefined);
		return;
	}
	console.log(url);
	const pathToFile = path.join(filePath, fileName);
	console.log(pathToFile);
	return new Promise((resolve, reject) => {
		const file = fs.createWriteStream(pathToFile);

		const request = proto.get(url, (response) => {
			if (response.statusCode === 302 || response.statusCode === 301) {
				//Recursively follow redirects, only a 200 will resolve.
				if (response.headers.location) {
					download(response.headers.location, filePath).then((filePath: string | undefined) =>
						resolve(filePath)
					);
				}
				return;
			} else if (response.statusCode !== 200) {
				fs.unlink(pathToFile, () => {
					reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
				});
				return;
			}
			console.log(file.path);
		});
		// The destination stream is ended by the time it's called
		file.on('finish', () => resolve(file.path.toString()));

		request.on('error', (err: unknown) => {
			fs.unlink(pathToFile, () => reject(err));
		});

		file.on('error', (err: unknown) => {
			fs.unlink(pathToFile, () => reject(err));
		});

		request.end();
	});
}
