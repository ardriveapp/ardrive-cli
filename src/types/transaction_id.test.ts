import { expect } from 'chai';
import { TransactionID, TxID } from './';

describe('TransactionID class', () => {
	describe('constructor', () => {
		it('constructs valid TransactionIDs given healthy inputs', () => {
			const txidInputs = [
				'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
				'ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ',
				'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
				'ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ',
				'0000000000000000000000000000000000000000000',
				'9999999999999999999999999999999999999999999',
				'-------------------------------------------',
				'___________________________________________',
				'abcdefghijklmnopqrstuvwxyz0123456789_-ABCXY'
			];
			txidInputs.forEach((txid) => expect(() => new TransactionID(txid)).to.not.throw(Error));
		});

		it('throws an error when provided invalid inputs', () => {
			const txidInputs = [
				'',
				'                                           ',
				'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
				'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
				'!@#$%^&*()+={}[]|;"<>/?}ZZZZZZZZZZZZZZZZZZZZ'
			];
			txidInputs.forEach((txid) => expect(() => new TransactionID(txid)).to.throw(Error));
		});
	});

	describe('toPrimitive function', () => {
		it('returns the correct Transaction ID string when hint is string', () => {
			const txid = new TransactionID('XHGs4-ibl7Bct2Vqt4LDq9FxzjxU7CqqETg9oFz83vP');
			expect(`${txid}`).to.equal('XHGs4-ibl7Bct2Vqt4LDq9FxzjxU7CqqETg9oFz83vP');
		});

		it('throws an error when hint is number', () => {
			const txid = new TransactionID('XHGs4-ibl7Bct2Vqt4LDq9FxzjxU7CqqETg9oFz83vP');
			expect(() => +txid).to.throw(Error);
		});
	});

	describe('toString function', () => {
		it('returns the correct Transaction ID string', () => {
			const txid = new TransactionID('XHGs4-ibl7Bct2Vqt4LDq9FxzjxU7CqqETg9oFz83vP');
			expect(txid.toString()).to.equal('XHGs4-ibl7Bct2Vqt4LDq9FxzjxU7CqqETg9oFz83vP');
		});
	});

	describe('valueOf function', () => {
		it('returns the correct Transaction ID string value', () => {
			const txid = new TransactionID('XHGs4-ibl7Bct2Vqt4LDq9FxzjxU7CqqETg9oFz83vP');
			expect(txid.valueOf()).to.equal('XHGs4-ibl7Bct2Vqt4LDq9FxzjxU7CqqETg9oFz83vP');
		});
	});

	describe('equals function', () => {
		it('correctly evaluates equality', () => {
			const txid1 = new TransactionID('XHGs4-ibl7Bct2Vqt4LDq9FxzjxU7CqqETg9oFz83vP');
			const txid2 = new TransactionID('XHGs4-ibl7Bct2Vqt4LDq9FxzjxU7CqqETg9oFz83vP');
			const txid3 = new TransactionID('XHGs4-ibl7Bct2Vqt4LDq9FxzjxU7CqqETg9oFz83vR');
			expect(txid1.equals(txid2), `${txid1} and ${txid2}`).to.be.true;
			expect(txid2.equals(txid1), `${txid2} and ${txid1}`).to.be.true;
			expect(txid1.equals(txid3), `${txid1} and ${txid3}`).to.be.false;
			expect(txid3.equals(txid1), `${txid3} and ${txid1}`).to.be.false;
			expect(txid2.equals(txid3), `${txid2} and ${txid3}`).to.be.false;
			expect(txid3.equals(txid2), `${txid3} and ${txid2}`).to.be.false;
		});
	});

	describe('toJSON function', () => {
		it('returns the correct JSON value', () => {
			const txId = new TransactionID('XHGs4-ibl7Bct2Vqt4LDq9FxzjxU7CqqETg9oFz83vP');
			expect(JSON.stringify({ txId })).to.equal('{"txId":"XHGs4-ibl7Bct2Vqt4LDq9FxzjxU7CqqETg9oFz83vP"}');
		});
	});
});

describe('TxID function', () => {
	it('returns the correct Transaction ID', () => {
		const expected = new TransactionID('XHGs4-ibl7Bct2Vqt4LDq9FxzjxU7CqqETg9oFz83vP');
		expect(`${TxID('XHGs4-ibl7Bct2Vqt4LDq9FxzjxU7CqqETg9oFz83vP')}`).to.equal(`${expected}`);
	});
});
