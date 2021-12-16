import { expect } from 'chai';
import { join as joinPath } from 'path';
import { stub } from 'sinon';
import { getOutputFilePathAndName } from './local_file_path';

const NAME_EXSTING_FOLDER_NAME = 'EXISTING_folder';
const NAME_EXISTING_FILE = 'EXISTING_file.txt';
const NAME_EXISTING_NON_FILE = 'EXISTING_socket_or_symbolic_link';
const NAME_NONEXISTENT_FILE = 'NONEXISTENT_crazy_file_with_cool_stuff.doc';

const PATH_EXISTING_PARENT_FOLDER = '/my/existing';
const PATH_EXISTING_FOLDER = joinPath(PATH_EXISTING_PARENT_FOLDER, NAME_EXSTING_FOLDER_NAME);
const PATH_EXISTING_FILE = joinPath(PATH_EXISTING_PARENT_FOLDER, NAME_EXISTING_FILE);
const PATH_EXISTING_NON_FILE = joinPath(PATH_EXISTING_PARENT_FOLDER, NAME_EXISTING_NON_FILE);
const PATH_NONEXISTENT_FILE = joinPath(PATH_EXISTING_FOLDER, NAME_NONEXISTENT_FILE);
const PATH_NONEXISTENT_FOLDER = '/some/NONEXISTENT/folder';

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
		// makes the resolve function to return the same given path
		fsStatSyncAndPathResolveWrapper.resolve.returnsArg(0);

		// makes the stubbed statsSync method to return a mocked fs.Stats for each corresponding case
		fsStatSyncAndPathResolveWrapper.statSync.withArgs(PATH_EXISTING_PARENT_FOLDER).returns(mockStatsFolder);
		fsStatSyncAndPathResolveWrapper.statSync.withArgs(PATH_EXISTING_FOLDER).returns(mockStatsFolder);
		fsStatSyncAndPathResolveWrapper.statSync.withArgs(PATH_EXISTING_FILE).returns(mockStatsFile);
		fsStatSyncAndPathResolveWrapper.statSync.withArgs(PATH_EXISTING_NON_FILE).returns(mockStatsNotFileNorFolder);
		// the stub throws for the nonexistent paths
		fsStatSyncAndPathResolveWrapper.statSync.throws();
	});

	it('returns only the provided path if it is a directory', () => {
		expect(getOutputFilePathAndName(PATH_EXISTING_FOLDER, fsStatSyncAndPathResolveWrapper)).to.deep.equal([
			PATH_EXISTING_FOLDER
		]);
	});

	it('returns the parent path and the basename if the file exists', () => {
		expect(getOutputFilePathAndName(PATH_EXISTING_FILE, fsStatSyncAndPathResolveWrapper)).to.deep.equal([
			PATH_EXISTING_PARENT_FOLDER,
			NAME_EXISTING_FILE
		]);
	});

	it("returns the parent path and the basename if it doesn't exist, but the parent does", () => {
		expect(getOutputFilePathAndName(PATH_NONEXISTENT_FILE, fsStatSyncAndPathResolveWrapper)).to.deep.equal([
			PATH_EXISTING_FOLDER,
			NAME_NONEXISTENT_FILE
		]);
	});

	it("throws if the path isn't a file nor a directory", () => {
		expect(() => getOutputFilePathAndName(PATH_EXISTING_NON_FILE, fsStatSyncAndPathResolveWrapper)).to.throw();
	});

	it('throws if the path nor its parent exist', () => {
		expect(() => getOutputFilePathAndName(PATH_NONEXISTENT_FOLDER, fsStatSyncAndPathResolveWrapper)).to.throw();
	});
});
