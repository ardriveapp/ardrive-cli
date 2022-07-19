import { expect } from 'chai';
import { derivateIpfsCid } from './derivate_ipfs_cid';

const dataToHash = [
	{ data: 'hello', hash: 'QmWfVY9y3xjsixTgbd9AorQxH7VtMpzfx2HaWtsoUYecaX' },
	{ data: 'my file data', hash: 'Qmd8s28wFUPP2rRbQEvvoHh84G22ShP5YzNgvT2mdhyrmq' },
	{ data: Buffer.from('my file data'), hash: 'Qmd8s28wFUPP2rRbQEvvoHh84G22ShP5YzNgvT2mdhyrmq' }
];

describe('derivateIpfsCid function', () => {
	it('returns the expeced hash', async () => {
		for (const expected of dataToHash) {
			const actualCid = await derivateIpfsCid(expected.data);
			expect(actualCid).to.equal(expected.hash);
		}
	});
});
