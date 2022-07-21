import { expect } from 'chai';
import { deriveIpfsCid } from './ipfs_utils';

const dataToHash = [
	{ data: 'hello', hash: 'QmWfVY9y3xjsixTgbd9AorQxH7VtMpzfx2HaWtsoUYecaX' },
	{ data: 'my file data', hash: 'Qmd8s28wFUPP2rRbQEvvoHh84G22ShP5YzNgvT2mdhyrmq' },
	{ data: Buffer.from('my file data'), hash: 'Qmd8s28wFUPP2rRbQEvvoHh84G22ShP5YzNgvT2mdhyrmq' }
];

describe('deriveIpfsCid function', () => {
	it('returns the expeced hash', async () => {
		for (const expected of dataToHash) {
			const actualCid = await deriveIpfsCid(expected.data);
			expect(actualCid).to.equal(expected.hash);
		}
	});
});
