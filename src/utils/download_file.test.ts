import { expect } from 'chai';
import { createServer, Server } from 'http';
import { AddressInfo } from 'net';
import { cleanUpTempFolder, getTempFolder } from './temp_folder';
import { downloadFile } from './download_file';
import * as fs from 'fs';

describe('downloadFile function', () => {
	// A local server rather than a public gateway, so the test does not fail
	// whenever the gateway rate-limits or is slow.
	const body = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);
	let server: Server;
	let baseUrl: string;

	before(async () => {
		server = createServer((req, res) => {
			if (req.url === '/valid') {
				res.writeHead(200, { 'content-type': 'image/jpeg', 'content-length': body.length });
				res.end(body);
			} else {
				res.writeHead(404);
				res.end();
			}
		});
		await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
		baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
	});

	const destinationFileName = 'cat.jpg';
	const tempFolderPath = getTempFolder();
	it('downloads a file into the provided folder when given a valid link', async () => {
		const { pathToFile, contentType } = await downloadFile(`${baseUrl}/valid`, tempFolderPath, destinationFileName);
		expect(fs.existsSync(pathToFile)).to.equal(true);
		expect(fs.readFileSync(pathToFile)).to.deep.equal(body);
		expect(contentType).to.equal('image/jpeg');
	});

	it('download throws when given an invalid link', async () => {
		let error;
		try {
			await downloadFile(`${baseUrl}/invalid`, tempFolderPath, destinationFileName);
		} catch (err) {
			error = err;
		}
		expect((error as Error)?.name).to.equal('Error');
		expect((error as Error)?.message).to.equal(
			`Failed to download file from remote path ${baseUrl}/invalid: Request failed with status code 404`
		);
	});

	after(async () => {
		cleanUpTempFolder();
		await new Promise((resolve) => server.close(resolve));
	});
});
