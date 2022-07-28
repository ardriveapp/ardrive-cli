import * as fs from 'fs';
import path from 'path';
import axios, { AxiosResponse } from 'axios';

/**
 * Downloads file from remote HTTP[S] host and puts its contents to the
 * specified location.
 */
export async function download(url: string, filePath: string): Promise<string | undefined> {
	const fileName = url.split('/').pop();
	if (!fileName) {
		return;
	}
	const response: AxiosResponse = await axios.get(url, { responseType: 'arraybuffer' });
	console.log(response.headers['content-type']);
	const pathToFile = path.join(filePath, fileName);

	fs.writeFileSync(pathToFile, response.data);
	return pathToFile;
}
