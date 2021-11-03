import { expect } from 'chai';
import { TransactionID } from './';

describe('TransactionID class', () => {
	describe('constructor', () => {
		it('constructs valid TransactionIDs given healthy inputs', () => {
			const txidInputs = ['aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'];
			txidInputs.forEach((txid) => expect(() => new TransactionID(txid)).to.not.throw(Error));
		});

		it('throws an error when provided invalid inputs', () => {
			const txidInputs = [''];
			txidInputs.forEach((txid) => expect(() => new TransactionID(txid)).to.throw(Error));
		});
	});

	// describe('toPrimitive function', () => {
	// 	it('returns the correct Entity ID string when hint is string', () => {
	// 		const eid = new EntityID('01234567-89ab-cdef-0000-000000000000');
	// 		expect(`${eid}`).to.equal('01234567-89ab-cdef-0000-000000000000');
	// 	});

	// 	it('throws an error when hint is number', () => {
	// 		const eid = new EntityID('01234567-89ab-cdef-0000-000000000000');
	// 		expect(() => +eid).to.throw(Error);
	// 	});
	// });

	// describe('toString function', () => {
	// 	it('returns the correct Entity ID string', () => {
	// 		const eid = new EntityID('01234567-89ab-cdef-0000-000000000000');
	// 		expect(eid.toString()).to.equal('01234567-89ab-cdef-0000-000000000000');
	// 		expect(`${eid}`).to.equal('01234567-89ab-cdef-0000-000000000000');
	// 	});
	// });

	// describe('valueOf function', () => {
	// 	it('returns the correct Entity ID string value', () => {
	// 		const eid = new EntityID('01234567-89ab-cdef-0000-000000000000');
	// 		expect(eid.valueOf()).to.equal('01234567-89ab-cdef-0000-000000000000');
	// 	});
	// });

	// describe('isEqualTo function', () => {
	// 	it('correctly evaluates equality', () => {
	// 		const eid1 = new EntityID('01234567-89ab-cdef-0000-000000000000');
	// 		const eid2 = new EntityID('01234567-89ab-cdef-0000-000000000000');
	// 		const eid3 = new EntityID('01234567-89ab-cdef-0000-000000000001');
	// 		expect(eid1.equals(eid2), `${eid1} and ${eid2}`).to.be.true;
	// 		expect(eid2.equals(eid1), `${eid2} and ${eid1}`).to.be.true;
	// 		expect(eid1.equals(eid3), `${eid1} and ${eid3}`).to.be.false;
	// 		expect(eid3.equals(eid1), `${eid3} and ${eid1}`).to.be.false;
	// 		expect(eid2.equals(eid3), `${eid2} and ${eid3}`).to.be.false;
	// 		expect(eid3.equals(eid2), `${eid3} and ${eid2}`).to.be.false;
	// 	});
	// });
});

// describe('EID function', () => {
// 	it('returns the correct EntityID', () => {
// 		const expected = new EntityID('01234567-89ab-cdef-0000-000000000000');
// 		expect(`${EID('01234567-89ab-cdef-0000-000000000000')}`).to.equal(`${expected}`);
// 	});
// });
