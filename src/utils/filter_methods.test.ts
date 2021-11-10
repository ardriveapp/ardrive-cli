import { expect } from 'chai';
import { ArFSPublicDrive } from '../arfs_entities';
import { Mutable, TxID } from '../types';
import { latestRevisionFilter, latestRevisionFilterForDrives } from './filter_methods';
import { stubPublicDrive, stubPublicFile } from './stubs';

describe('The latestRevisionFilter function', () => {
	it('returns true when only entry in array matches the search entry', () => {
		const stubFile = stubPublicFile({});
		expect(latestRevisionFilter(stubFile, 0, [stubFile])).to.be.true;
	});

	it('returns true when search entry is the first in the entity array', () => {
		const stubFile = stubPublicFile({});
		const stubFile2 = stubPublicFile({ txId: TxID('0000000000000000000000000000000000000000001') });
		expect(latestRevisionFilter(stubFile, 0, [stubFile, stubFile2])).to.be.true;
	});

	it('returns false when search entry is not first in the entity array', () => {
		const stubFile = stubPublicFile({});
		const stubFile2 = stubPublicFile({ txId: TxID('0000000000000000000000000000000000000000001') });
		expect(latestRevisionFilter(stubFile, 0, [stubFile2, stubFile])).to.be.false;
	});
});

describe('The latestRevisionFilterForDrives function', () => {
	it('returns true when only entry in array matches the search entry', () => {
		const stubDrive = stubPublicDrive();
		expect(latestRevisionFilterForDrives(stubDrive, 0, [stubDrive])).to.be.true;
	});

	it('returns true when search entry is the first in the entity array', () => {
		const stubDrive = stubPublicDrive();
		const stubDrive2 = stubPublicDrive();
		(stubDrive2 as Mutable<ArFSPublicDrive>).txId = TxID('0000000000000000000000000000000000000000001');
		expect(latestRevisionFilterForDrives(stubDrive, 0, [stubDrive, stubDrive2])).to.be.true;
	});

	it('returns false when search entry is not first in the entity array', () => {
		const stubDrive = stubPublicDrive();
		const stubDrive2 = stubPublicDrive();
		(stubDrive2 as Mutable<ArFSPublicDrive>).txId = TxID('0000000000000000000000000000000000000000001');
		expect(latestRevisionFilterForDrives(stubDrive, 0, [stubDrive2, stubDrive])).to.be.false;
	});
});
