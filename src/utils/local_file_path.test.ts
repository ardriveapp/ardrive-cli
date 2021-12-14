import { expect } from 'chai';
import { stub } from 'sinon';
import { getOutputFilePathAndName } from './local_file_path';

const PATH_EXISTING_FOLDER = '/my/existing/folder';
const PATH_EXISTING_FILE = '/my/existing/file.txt';
const PATH_UNEXISTANT_FOLDER = '/some/unexisting/folder';
const PATH_UNEXISTANT_FILE = '/my/existing/folder/file.txt';
const PATH_EXISTING_SOCKET = '/my/existing/socket';

const mockStatsFolder = {
	isDirectory: () => true,
	isFile: () => false
};

const mockStatsFile = {
	isDirectory: () => false,
	isFile: () => true
};

const mockStatsNotFileNorFolder = {
	isDirectory: () => false,
	isFile: () => false
};

describe('getOutputFilePathAndName function', () => {
	const fsStatSyncAndPathResolveWrapper = {
		statSync: stub(),
		resolve: stub()
	};

	before(() => {
		fsStatSyncAndPathResolveWrapper.resolve.returnsArg(0);
	});

	beforeEach(() => {
		fsStatSyncAndPathResolveWrapper.statSync.withArgs(PATH_EXISTING_FOLDER).returns(mockStatsFolder);
		fsStatSyncAndPathResolveWrapper.statSync.withArgs('/my/existing').returns(mockStatsFolder);
		fsStatSyncAndPathResolveWrapper.statSync.withArgs(PATH_EXISTING_FILE).returns(mockStatsFile);
		fsStatSyncAndPathResolveWrapper.statSync.withArgs(PATH_EXISTING_SOCKET).returns(mockStatsNotFileNorFolder);
		fsStatSyncAndPathResolveWrapper.statSync.throws();
	});

	it('returns only the providen path if it is a directory', () => {
		expect(getOutputFilePathAndName(PATH_EXISTING_FOLDER, fsStatSyncAndPathResolveWrapper)).to.deep.equal([
			PATH_EXISTING_FOLDER
		]);
	});

	it('returns the parent path and the basename if the file exists', () => {
		expect(getOutputFilePathAndName(PATH_EXISTING_FILE, fsStatSyncAndPathResolveWrapper)).to.deep.equal([
			'/my/existing',
			'file.txt'
		]);
	});

	it("returns the parent path and the basename if it doesn't exist, but the parent does", () => {
		expect(getOutputFilePathAndName(PATH_UNEXISTANT_FILE, fsStatSyncAndPathResolveWrapper)).to.deep.equal([
			'/my/existing/folder',
			'file.txt'
		]);
	});

	it("throws if the path isn't a file nor a directory", () => {
		expect(() => getOutputFilePathAndName(PATH_EXISTING_SOCKET, fsStatSyncAndPathResolveWrapper)).to.throw();
	});

	it('throws if the path nor its parent exist', () => {
		expect(() => getOutputFilePathAndName(PATH_UNEXISTANT_FOLDER, fsStatSyncAndPathResolveWrapper)).to.throw();
	});
});
