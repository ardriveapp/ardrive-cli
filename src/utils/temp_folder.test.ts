import { expect } from 'chai';
import { cleanUpTempFolder, getTempFolder } from './temp_folder';
import * as fs from 'fs';
import * as os from 'os';

describe('getTempFolder function', () => {
	it('returns a folder that exists', () => {
		const tempFolderPath = getTempFolder();
		expect(fs.existsSync(tempFolderPath)).to.equal(true);
	});

	it('getTempFolder can be called twice in a row', () => {
		const tempFolderPath = getTempFolder();
		const tempFolderPath2 = getTempFolder();
		expect(fs.existsSync(tempFolderPath)).to.equal(true);
		expect(fs.existsSync(tempFolderPath2)).to.equal(true);
	});

	it('returns a folder that contains the correct subfolders', () => {
		const tempFolderPath = getTempFolder();
		const expectedPathComponent = os.platform() === 'win32' ? '\\ardrive-downloads' : '/.ardrive/ardrive-downloads';
		expect(tempFolderPath).to.contains(expectedPathComponent);
	});

	it('cleanUpTempFolder removes the temporary folder from the local system', () => {
		const tempFolderPath = getTempFolder();
		expect(fs.existsSync(tempFolderPath)).to.equal(true);
		cleanUpTempFolder();
		expect(fs.existsSync(tempFolderPath)).to.equal(false);
	});
	it('cleanUpTempFolder can be called twice in a row', () => {
		const tempFolderPath = getTempFolder();
		expect(fs.existsSync(tempFolderPath)).to.equal(true);
		cleanUpTempFolder();
		expect(fs.existsSync(tempFolderPath)).to.equal(false);
		cleanUpTempFolder();
		expect(fs.existsSync(tempFolderPath)).to.equal(false);
	});
});
