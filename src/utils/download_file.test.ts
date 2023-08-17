import { expect } from 'chai';
import { cleanUpTempFolder, getTempFolder } from './temp_folder';
import { downloadFile } from './download_file';
import * as fs from 'fs';

describe('downloadFile function', () => {
	const validDownloadLink = 'https://arweave.net/pVoSqZgJUCiNw7oS6CtlVEd8gREQlpRbccrsMLkeIuQ';
	const invalidDownloadLink = 'https://arweave.net/pVoSqZgJUCiNw7oS6CtlVEV8gREQlpRbccrsMLkeIuQ';
	const destinationFileName = 'cat.jpg';
	const tempFolderPath = getTempFolder();
	it('downloads a file into the provided folder when given a valid link', async () => {
		const { pathToFile, contentType } = await downloadFile(validDownloadLink, tempFolderPath, destinationFileName);
		expect(fs.existsSync(pathToFile)).to.equal(true);
		expect(contentType).to.equal('image/jpeg');
	});

	it('download throws when given an invalid link', async () => {
		let error;
		try {
			await downloadFile(invalidDownloadLink, tempFolderPath, destinationFileName);
		} catch (err) {
			error = err;
		}
		expect((error as Error)?.name).to.equal('Error');
		expect((error as Error)?.message).to.equal(
			'Failed to download file from remote path https://arweave.net/pVoSqZgJUCiNw7oS6CtlVEV8gREQlpRbccrsMLkeIuQ: Request failed with status code 404'
		);
	});

	after(() => {
		cleanUpTempFolder();
	});
});
