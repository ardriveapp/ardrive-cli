import { expect } from 'chai';
import { getTempFolder } from './temp';
import { download } from './download';
import * as fs from 'fs';

describe('download test', () => {
	const validDownloadLink = 'https://arweave.net/pVoSqZgJUCiNw7oS6CtlVEd8gREQlpRbccrsMLkeIuQ';
	const invalidDownloadLink = 'https://arweave.net/pVoSqZgJUCiNw7oS6CtlVEV8gREQlpRbccrsMLkeIuQ';
	const tempFolderPath = getTempFolder();
	it('downloads a file into the provided folder when given a valid link', async () => {
		const result = await download(validDownloadLink, tempFolderPath);
		expect(fs.existsSync(result)).to.equal(true);
	});

	it('download throws when given an invalid link', async () => {
		let error;
		try {
			await download(invalidDownloadLink, tempFolderPath);
		} catch (err) {
			error = err;
		}
		expect(error?.name).to.equal('Error');
	});
});
