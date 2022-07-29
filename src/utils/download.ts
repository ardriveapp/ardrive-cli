import * as fs from 'fs';
import path from 'path';
import axios, { AxiosResponse } from 'axios';

/**
 * Downloads file from remote HTTP[S] host and puts its contents to the
 * specified location.
 * @param url URL of the file to download.
 * @param destinationPath Path to the destination file.
 */
export async function download(url: string, filePath: string): Promise<string | undefined> {
	const fileName = url.split('/').pop();
	if (!fileName) {
		throw new Error('Invalid remote path. No file name found.');
	}
	try {
		const response: AxiosResponse = await axios.get(url, { responseType: 'arraybuffer' });
		console.log(response.headers['content-type']);
		const pathToFile = path.join(filePath, fileName);

		fs.writeFileSync(pathToFile, response.data);
		return pathToFile;
	} catch (error) {
		throw new Error(`Failed to download file from remote path ${url}: ${error.message}`);
	}
}
