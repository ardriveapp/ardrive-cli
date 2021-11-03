import { expect } from 'chai';
import { ArweaveAddress } from './arweave_address';

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
				expect(() => new ArweaveAddress(badAddress)).to.throw(Error);
			});
		});

		it('throws an error for input addresses with invalid characters', () => {
			const invalidAddresses = '!@#$%^&*()+=~`{[}]\\|;:\'"<,>.?/'.split('').map((char) => char.repeat(43));
			invalidAddresses.forEach((badAddress) => {
				expect(() => new ArweaveAddress(badAddress)).to.throw(Error);
			});
		});
	});

	describe('interpolated toString function', () => {
		it('returns the underlying address string', () => {
			const address = new ArweaveAddress('g1hzNXVbh2M6LMQSUYp7HgkgxdadYqYEfw-HAajlms0');
			expect(`${address}`).to.equal('g1hzNXVbh2M6LMQSUYp7HgkgxdadYqYEfw-HAajlms0');
		});

		it('throws if casted to a number');
		// it('throws if casted to a number', () => {
		// 	const address = new ArweaveAddress('g1hzNXVbh2M6LMQSUYp7HgkgxdadYqYEfw-HAajlms0');
		// 	expect(() => +address).to.throw();
		// });
	});

	describe('equalsAddress function', () => {
		it('returns true for mathing addresses', () => {
			const address = new ArweaveAddress('g1hzNXVbh2M6LMQSUYp7HgkgxdadYqYEfw-HAajlms0');
			const addressOther = new ArweaveAddress('g1hzNXVbh2M6LMQSUYp7HgkgxdadYqYEfw-HAajlms0');
			expect(address.equalsAddress(addressOther)).to.be.true;
		});

		it('returns false for different addresses', () => {
			const address = new ArweaveAddress('g1hzNXVbh2M6LMQSUYp7HgkgxdadYqYEfw-HAajlms0');
			const addressOther = new ArweaveAddress('a1hzNXVbh2M6LMQSUYp7HgkgxdadYqYEfw-HAajlms0');
			expect(address.equalsAddress(addressOther)).to.be.false;
		});
	});
});
