import { expect } from 'chai';
import { deriveIpfsCid } from './ipfs_utils';

const dataToHash = [
	{ inputData: 'hello', expectedHash: 'QmWfVY9y3xjsixTgbd9AorQxH7VtMpzfx2HaWtsoUYecaX' },
	{ inputData: 'my file data', expectedHash: 'Qmd8s28wFUPP2rRbQEvvoHh84G22ShP5YzNgvT2mdhyrmq' },
	{ inputData: Buffer.from('my file data'), expectedHash: 'Qmd8s28wFUPP2rRbQEvvoHh84G22ShP5YzNgvT2mdhyrmq' },
	// Chunk boundaries, with the CIDs the previous ipfs-only-hash@4 implementation produced
	{ inputData: Buffer.alloc(0), expectedHash: 'QmbFMke1KXqnYyBBWxB74N4c5SBnJMVAiMNRcGu6x1AwQH' },
	{ inputData: Buffer.alloc(262144, 'a'), expectedHash: 'Qma81h2ZqbvJW2EQkiVUZ17aSvNWqAtvUPhh8mQBPU8W7c' },
	{ inputData: Buffer.alloc(262145, 'a'), expectedHash: 'QmTaxvXcxpzzaatSEEAYr7t3knkJ6DmTVbr8MjJJWLRWpV' },
	{ inputData: Buffer.alloc(1048577, 'a'), expectedHash: 'QmdH8AYwGrfjqP9Bp1Q9D53FnWpmU3wRPHCtYHCrRUUno9' }
];

describe('deriveIpfsCid function', () => {
	it('returns the expeced hash', async () => {
		for (const testCaseData of dataToHash) {
			const actualCid = await deriveIpfsCid(testCaseData.inputData);
			expect(actualCid).to.equal(testCaseData.expectedHash);
		}
	});
});
