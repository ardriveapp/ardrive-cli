import { randomUUID } from 'crypto';
import { expect } from 'chai';
import { ArFSResult, ArweaveAddress, EntityID, TransactionID, Winston } from 'ardrive-core-js';

import { formatResults } from './upload_file';

// Any TxIDs, EntityIDS and Arweave addresses used on this mock are invalid as it's not those values that are being tested
// Real values are not UUIDs.
const createResultMock = (): ArFSResult => ({
	created: [
		{
			type: 'file',
			metadataTxId: (randomUUID() as unknown) as TransactionID,
			dataTxId: (randomUUID() as unknown) as TransactionID,
			entityId: (randomUUID() as unknown) as EntityID
		}
	],
	tips: [
		{
			txId: (randomUUID() as unknown) as TransactionID,
			recipient: (randomUUID() as unknown) as ArweaveAddress,
			winston: new Winston(10000000)
		}
	],
	fees: {
		[randomUUID()]: new Winston(40121526),
		[randomUUID()]: new Winston(40121526),
		[randomUUID()]: new Winston(401226)
	}
});

describe('Commands - upload-file', () => {
	it('formatResults should merge multiple results in just one object', () => {
		const firstResult = createResultMock();
		const secondResult = createResultMock();

		const resultsOutput = formatResults([firstResult, secondResult]);

		// created
		expect(resultsOutput.created[0]).to.deep.equal(firstResult.created[0]);
		expect(resultsOutput.created[1]).to.deep.equal(secondResult.created[0]);

		// tips
		expect(resultsOutput.tips[0]).to.deep.equal(firstResult.tips[0]);
		expect(resultsOutput.tips[1]).to.deep.equal(secondResult.tips[0]);

		const firstFeeFromFirstResult = Object.keys(firstResult.fees)[0];
		const firstFeeFromSecondResult = Object.keys(firstResult.fees)[0];
		const resultsOutputFeeKeys = Object.keys(resultsOutput.fees);

		// fees
		expect(resultsOutputFeeKeys).to.include(firstFeeFromFirstResult);
		expect(resultsOutputFeeKeys).to.include(firstFeeFromSecondResult);
	});
});
