import * as fs from 'fs';
import path from 'path';
import axios from 'axios';

type DownloadProgressCallback = (downloadProgress: number) => void;

/**
 * Downloads file from remote HTTP[S] host and puts its contents to the
 * specified location.
 * @param url URL of the file to download.
 * @param destinationPath Path to the destination file.
 * @param destinationFileName The file name.
 */
export async function download(
	url: string,
	destinationPath: string,
	destinationFileName: string,
	downloadProgressCallback?: DownloadProgressCallback
): Promise<string> {
	const pathToFile = path.join(destinationPath, destinationFileName);
	const writer = fs.createWriteStream(pathToFile);
	try {
		const { data, headers } = await axios({
			method: 'get',
			url: url,
			responseType: 'stream'
		});
		const totalLength = headers['content-length'];

		data.on(
			'data',
			(chunk: string | unknown[]) =>
				downloadProgressCallback && downloadProgressCallback((chunk.length / totalLength) * 100)
		);
		return new Promise((resolve) => {
			data.pipe(writer);
			let error: Error | null = null;
			writer.on('error', (err) => {
				error = err;
				writer.close();
			});
			writer.on('close', () => {
				if (!error) {
					resolve(pathToFile);
				}
			});
		});
	} catch (error) {
		writer.close();
		throw new Error(`Failed to download file from remote path ${url}: ${error.message}`);
	}
}
