import { expect } from 'chai';
import { cleanUpTempFolder, getTempFolder } from './temp';
import * as fs from 'fs';

describe('temp folder test', () => {
	it('temp returns a folder that exists', () => {
		const tempFolderPath = getTempFolder();
		expect(fs.existsSync(tempFolderPath)).to.equal(true);
	});

	it('temp path returned contains the correct subfolders', () => {
		const tempFolderPath = getTempFolder();
		expect(tempFolderPath).to.contains('ardrive');
		expect(tempFolderPath).to.contains('temp');
	});

	it('cleanUpTempFolder removes the temporary folder from the local system', () => {
		const tempFolderPath = getTempFolder();
		expect(fs.existsSync(tempFolderPath)).to.equal(true);
		cleanUpTempFolder();
		expect(fs.existsSync(tempFolderPath)).to.equal(false);
	});
});
