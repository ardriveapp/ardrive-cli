import { expect } from 'chai';
import { ADDR, ArFSResult, EID, TxID, W } from 'ardrive-core-js';

import { formatResults } from './upload_file';

describe('Commands - upload-file', () => {
	it('formatResults should merge multiple results in just one object', () => {
		const firstResult: ArFSResult = {
			created: [
				{
					type: 'file',
					metadataTxId: TxID('0000000000000000000000000000000000000000000'),
					dataTxId: TxID('0000000000000000000000000000000000000000001'),
					entityId: EID('00000000-0000-0000-0000-000000000000'),
					key: 'fakeKey1'
				}
			],
			tips: [
				{
					txId: TxID('0000000000000000000000000000000000000000001'),
					recipient: ADDR('abcdefghijklmnopqrxtuvwxyz123456789ABCDEFGH'),
					winston: W(12345)
				}
			],
			fees: {
				'0000000000000000000000000000000000000000001': W(24680)
			}
		};

		const secondResult: ArFSResult = {
			created: [
				{
					type: 'file',
					metadataTxId: TxID('0000000000000000000000000000000000000000002'),
					dataTxId: TxID('0000000000000000000000000000000000000000003'),
					entityId: EID('00000000-0000-0000-0000-000000000001'),
					key: 'fakeKey2'
				}
			],
			tips: [
				{
					txId: TxID('0000000000000000000000000000000000000000003'),
					recipient: ADDR('123456789ABCDEFGHabcdefghijklmnopqrxtuvwxyz'),
					winston: W(54321)
				}
			],
			fees: {
				'0000000000000000000000000000000000000000003': W(13579)
			}
		};

		const resultsOutput = formatResults([firstResult, secondResult]);

		// created
		expect(resultsOutput).to.deep.equal({
			created: [
				{
					type: 'file',
					metadataTxId: TxID('0000000000000000000000000000000000000000000'),
					dataTxId: TxID('0000000000000000000000000000000000000000001'),
					entityId: EID('00000000-0000-0000-0000-000000000000'),
					key: 'fakeKey1'
				},
				{
					type: 'file',
					metadataTxId: TxID('0000000000000000000000000000000000000000002'),
					dataTxId: TxID('0000000000000000000000000000000000000000003'),
					entityId: EID('00000000-0000-0000-0000-000000000001'),
					key: 'fakeKey2'
				}
			],
			tips: [
				{
					txId: TxID('0000000000000000000000000000000000000000001'),
					recipient: ADDR('abcdefghijklmnopqrxtuvwxyz123456789ABCDEFGH'),
					winston: W(12345)
				},
				{
					txId: TxID('0000000000000000000000000000000000000000003'),
					recipient: ADDR('123456789ABCDEFGHabcdefghijklmnopqrxtuvwxyz'),
					winston: W(54321)
				}
			],
			fees: {
				'0000000000000000000000000000000000000000001': W(24680),
				'0000000000000000000000000000000000000000003': W(13579)
			}
		});
	});
});
