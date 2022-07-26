import * as http from 'http';
import * as https from 'https';
import * as fs from 'fs';

/**
 * Downloads file from remote HTTP[S] host and puts its contents to the
 * specified location.
 */
export async function download(url: string, filePath: string): Promise<string | undefined> {
	const proto = !url.charAt(4).localeCompare('s') ? https : http;

	return new Promise((resolve, reject) => {
		const file = fs.createWriteStream(filePath);

		const request = proto.get(url, (response) => {
			if (response.statusCode !== 200) {
				fs.unlink(filePath, () => {
					reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
				});
				return;
			}

			response.pipe(file);
		});

		// The destination stream is ended by the time it's called
		file.on('finish', () => resolve(file.path.toString()));

		request.on('error', (err: unknown) => {
			fs.unlink(filePath, () => reject(err));
		});

		file.on('error', (err: unknown) => {
			fs.unlink(filePath, () => reject(err));
		});

		request.end();
	});
}
