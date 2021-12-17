import { expect } from 'chai';
import { join as joinPath } from 'path';
import { stub } from 'sinon';
import { getOutputFolderPathAndName } from './local_folder_path';

const NAME_EXSTING_FOLDER_NAME = 'EXISTING_folder';
const NAME_EXISTING_FILE = 'EXISTING_file.txt';
const NAME_NONEXISTENT_FOLDER = 'NONEXISTENT_folder';

const PATH_EXISTING_PARENT_FOLDER = '/my/existing';
const PATH_EXISTING_FOLDER = joinPath(PATH_EXISTING_PARENT_FOLDER, NAME_EXSTING_FOLDER_NAME);
const PATH_EXISTING_FILE = joinPath(PATH_EXISTING_PARENT_FOLDER, NAME_EXISTING_FILE);
const PATH_UNEXISTENT_FOLDER = joinPath(PATH_EXISTING_PARENT_FOLDER, NAME_NONEXISTENT_FOLDER);
const PATH_NONEXISTENT_PATH = '/some/NONEXISTENT/path';

const mockStatsFolder = {
	isDirectory: () => true,
	isFile: () => false
};

const mockStatsFile = {
	isDirectory: () => false,
	isFile: () => true
};

describe('getOutputFolderPathAndName function', () => {
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
		// the stub throws for the nonexistent paths
		fsStatSyncAndPathResolveWrapper.statSync.throws();
	});

	it('returns only the providen path if it is a directory', () => {
		expect(getOutputFolderPathAndName(PATH_EXISTING_FOLDER, fsStatSyncAndPathResolveWrapper)).to.deep.equal([
			PATH_EXISTING_FOLDER
		]);
	});

	it('returns the parent path and the basename if the path in nonexistent but the parent is a directory', () => {
		expect(getOutputFolderPathAndName(PATH_UNEXISTENT_FOLDER, fsStatSyncAndPathResolveWrapper)).to.deep.equal([
			PATH_EXISTING_PARENT_FOLDER,
			NAME_NONEXISTENT_FOLDER
		]);
	});

	it("throws if the path isn't a directory", () => {
		expect(() => getOutputFolderPathAndName(PATH_EXISTING_FILE, fsStatSyncAndPathResolveWrapper)).to.throw();
	});

	it('throws if the path nor its parent exist', () => {
		expect(() => getOutputFolderPathAndName(PATH_NONEXISTENT_PATH, fsStatSyncAndPathResolveWrapper)).to.throw();
	});
});
