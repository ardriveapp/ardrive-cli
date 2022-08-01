import * as fs from 'fs';
import path from 'path';
import axios from 'axios';
import { uniqueId } from 'lodash';

type DownloadProgressCallback = (downloadProgress: number) => void;

/**
 * Downloads file from remote HTTP[S] host and puts its contents to the
 * specified location.
 * @param url URL of the file to download.
 * @param destinationPath Path to the destination file.
 * @param fileName The file name. If no name is provided a random name will be used.
 */
export async function download(
	url: string,
	destinationPath: string,
	downloadProgressCallback?: DownloadProgressCallback,
	fileName?: string
): Promise<string> {
	const name = fileName ?? url.split('/').pop() ?? uniqueId();
	const pathToFile = path.join(destinationPath, name);
	try {
		const writer = fs.createWriteStream(pathToFile);

		return axios({
			method: 'get',
			url: url,
			responseType: 'stream',
			onDownloadProgress: downloadProgressCallback
		}).then((response) => {
			//ensure that the user can call `then()` only when the file has
			//been downloaded entirely.

			return new Promise((resolve, reject) => {
				response.data.pipe(writer);
				let error: Error | null = null;
				writer.on('error', (err) => {
					error = err;
					writer.close();
					reject(err);
				});
				writer.on('close', () => {
					if (!error) {
						resolve(pathToFile);
					}
					//no need to call the reject here, as it will have been called in the
					//'error' stream;
				});
			});
		});
	} catch (error) {
		throw new Error(`Failed to download file from remote path ${url}: ${error.message}`);
	}
}
