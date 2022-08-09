import { expect } from 'chai';
import { deriveIpfsCid } from './ipfs_utils';

const dataToHash = [
	{ inputData: 'hello', expectedHash: 'QmWfVY9y3xjsixTgbd9AorQxH7VtMpzfx2HaWtsoUYecaX' },
	{ inputData: 'my file data', expectedHash: 'Qmd8s28wFUPP2rRbQEvvoHh84G22ShP5YzNgvT2mdhyrmq' },
	{ inputData: Buffer.from('my file data'), expectedHash: 'Qmd8s28wFUPP2rRbQEvvoHh84G22ShP5YzNgvT2mdhyrmq' }
];

describe('deriveIpfsCid function', () => {
	it('returns the expeced hash', async () => {
		for (const testCaseData of dataToHash) {
			const actualCid = await deriveIpfsCid(testCaseData.inputData);
			expect(actualCid).to.equal(testCaseData.expectedHash);
		}
	});
});
