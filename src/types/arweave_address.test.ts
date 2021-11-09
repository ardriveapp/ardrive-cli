import { expect } from 'chai';
import { ADDR, ArweaveAddress } from './arweave_address';

describe('The ArweaveAddress class', () => {
	describe('constructor', () => {
		it('creates a new address when given a valid address string', () => {
			const validAddresses = [
				'-------------------------------------------',
				'___________________________________________',
				'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
				'ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ',
				'0000000000000000000000000000000000000000000',
				'0123456789012345678901234567890123456789012',
				'g1hzNXVbh2M6LMQSUYp7HgkgxdadYqYEfw-HAajlms0'
			];
			validAddresses.forEach((address) => {
				expect(() => new ArweaveAddress(address)).to.not.throw();
			});
		});

		it('throws an error for input addresses that are not 43 characters in length', () => {
			const invalidAddresses = ['', '-', 'g1hzNXVbh2M6LMQSUYp7HgkgxdadYqYEfw-HAajlms01'];
			invalidAddresses.forEach((badAddress) => {
				expect(() => ADDR(badAddress)).to.throw(Error);
			});
		});

		it('throws an error for input addresses with invalid characters', () => {
			const invalidAddresses = '!@#$%^&*()+=~`{[}]\\|;:\'"<,>.?/'.split('').map((char) => char.repeat(43));
			invalidAddresses.forEach((badAddress) => {
				expect(() => ADDR(badAddress)).to.throw(Error);
			});
		});
	});

	describe('toPrimitive function', () => {
		it('returns the correct ByteCount string when hint is string', () => {
			const address = ADDR('g1hzNXVbh2M6LMQSUYp7HgkgxdadYqYEfw-HAajlms0');
			expect(`${address}`).to.equal('g1hzNXVbh2M6LMQSUYp7HgkgxdadYqYEfw-HAajlms0');
		});

		it('throws when hint is number', () => {
			const address = ADDR('g1hzNXVbh2M6LMQSUYp7HgkgxdadYqYEfw-HAajlms0');
			expect(() => +address).to.throw();
		});
	});

	describe('equals function', () => {
		it('returns true for mathing addresses', () => {
			const address = ADDR('g1hzNXVbh2M6LMQSUYp7HgkgxdadYqYEfw-HAajlms0');
			const addressOther = ADDR('g1hzNXVbh2M6LMQSUYp7HgkgxdadYqYEfw-HAajlms0');
			expect(address.equals(addressOther)).to.be.true;
		});

		it('returns false for different addresses', () => {
			const address = ADDR('g1hzNXVbh2M6LMQSUYp7HgkgxdadYqYEfw-HAajlms0');
			const addressOther = ADDR('a1hzNXVbh2M6LMQSUYp7HgkgxdadYqYEfw-HAajlms0');
			expect(address.equals(addressOther)).to.be.false;
		});
	});

	describe('toString function', () => {
		it('returns the correct ArweaveAddress string', () => {
			const address = ADDR('g1hzNXVbh2M6LMQSUYp7HgkgxdadYqYEfw-HAajlms0');
			expect(address.toString()).to.equal('g1hzNXVbh2M6LMQSUYp7HgkgxdadYqYEfw-HAajlms0');
		});
	});

	describe('valueOf function', () => {
		it('returns the correct ArweaveAddress string value', () => {
			const address = ADDR('g1hzNXVbh2M6LMQSUYp7HgkgxdadYqYEfw-HAajlms0');
			expect(address.valueOf()).to.equal('g1hzNXVbh2M6LMQSUYp7HgkgxdadYqYEfw-HAajlms0');
		});
	});

	describe('toJSON function', () => {
		it('returns the correct JSON value', () => {
			const address = ADDR('g1hzNXVbh2M6LMQSUYp7HgkgxdadYqYEfw-HAajlms0');
			expect(JSON.stringify({ address })).to.equal('{"address":"g1hzNXVbh2M6LMQSUYp7HgkgxdadYqYEfw-HAajlms0"}');
		});
	});
});
