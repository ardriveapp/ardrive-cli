import * as fs from 'fs';
import path from 'path';
import axios from 'axios';
import util from 'util';
import stream from 'stream';

const pipeline = util.promisify(stream.pipeline);

type DownloadProgressCallback = (downloadProgress: number) => void;
type DownloadResult = { pathToFile: string; contentType: string };

/**
 * Downloads file from remote HTTP[S] host and puts its contents to the
 * specified location.
 * @param url URL of the file to download.
 * @param destinationPath Path to the destination file.
 * @param destinationFileName The file name.
 */

export async function downloadFile(
	url: string,
	destinationPath: string,
	destinationFileName: string,
	downloadProgressCallback?: DownloadProgressCallback
): Promise<DownloadResult> {
	const pathToFile = path.join(destinationPath, destinationFileName);
	const writer = fs.createWriteStream(pathToFile);

	try {
		const { data, headers } = await axios({
			method: 'get',
			url: url,
			responseType: 'stream'
		});
		const totalLength = headers['content-length'];
		const contentType = headers['content-type'];
		let downloadedLength = 0;
		data.on('data', (chunk: string | unknown[]) => {
			downloadedLength += chunk.length;
			const downloadProgressPct = totalLength > 0 ? (downloadedLength / totalLength) * 100 : 0;

			downloadProgressCallback && downloadProgressCallback(downloadProgressPct);
		});
		await pipeline(data, writer);
		return { pathToFile, contentType };
	} catch (error) {
		writer.close();
		throw new Error(`Failed to download file from remote path ${url}: ${error.message}`);
	}
}
