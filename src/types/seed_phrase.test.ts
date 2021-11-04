import { expect } from 'chai';
import { SeedPhrase } from './seed_phrase';

describe('SeedPhrase class', () => {
	describe('constructor', () => {
		it('constructs valid SeedPhrase given healthy input', () => {
			const eidInputs = ['the quick brown fox jumps over the lazy dog every single day'];
			eidInputs.forEach((seedPhrase) => expect(() => new SeedPhrase(seedPhrase)).to.not.throw(Error));
		});

		it('throws an error when provided invalid inputs', () => {
			const eidInputs = [
				'',
				'the quick brown fox jumps over the lazy dog',
				'the quick brown fox jumps over the lazy dog every single day except today',
				'99999999-9999-999909999-999999999999'
			];
			eidInputs.forEach((seedPhrase) =>
				expect(() => new SeedPhrase(seedPhrase), `${seedPhrase} should throw`).to.throw(Error)
			);
		});
	});

	describe('toPrimitive function', () => {
		it('returns the correct Seed Phrase string when hint is string', () => {
			const eid = new SeedPhrase('the quick brown fox jumps over the lazy dog every single day');
			expect(`${eid}`).to.equal('the quick brown fox jumps over the lazy dog every single day');
		});

		it('throws an error when hint is number', () => {
			const seedPhrase = new SeedPhrase('the quick brown fox jumps over the lazy dog every single day');
			expect(() => +seedPhrase).to.throw(Error);
		});
	});

	describe('toString function', () => {
		it('returns the correct Seed Phrase string', () => {
			const seedPhrase = new SeedPhrase('the quick brown fox jumps over the lazy dog every single day');
			expect(seedPhrase.toString()).to.equal('the quick brown fox jumps over the lazy dog every single day');
		});
	});

	describe('valueOf function', () => {
		it('returns the correct Seed Phrase string value', () => {
			const seedPhrase = new SeedPhrase('the quick brown fox jumps over the lazy dog every single day');
			expect(seedPhrase.valueOf()).to.equal('the quick brown fox jumps over the lazy dog every single day');
		});
	});

	describe('equals function', () => {
		it('correctly evaluates equality', () => {
			const seedPhrase1 = new SeedPhrase('the quick brown fox jumps over the lazy dog every single day');
			const seedPhrase2 = new SeedPhrase('the quick brown fox jumps over the lazy dog every single day');
			const seedPhrase3 = new SeedPhrase('the quick brown fox jumps over the lazy dog every other day');
			expect(seedPhrase1.equals(seedPhrase2), `${seedPhrase1} and ${seedPhrase2}`).to.be.true;
			expect(seedPhrase2.equals(seedPhrase1), `${seedPhrase2} and ${seedPhrase1}`).to.be.true;
			expect(seedPhrase1.equals(seedPhrase3), `${seedPhrase1} and ${seedPhrase3}`).to.be.false;
			expect(seedPhrase3.equals(seedPhrase1), `${seedPhrase3} and ${seedPhrase1}`).to.be.false;
			expect(seedPhrase2.equals(seedPhrase3), `${seedPhrase2} and ${seedPhrase3}`).to.be.false;
			expect(seedPhrase3.equals(seedPhrase2), `${seedPhrase3} and ${seedPhrase2}`).to.be.false;
		});
	});

	describe('toJSON function', () => {
		it('returns the correct JSON value', () => {
			const seedPhrase = new SeedPhrase('the quick brown fox jumps over the lazy dog every single day');
			expect(JSON.stringify({ seedPhrase })).to.equal(
				'{"seedPhrase":"the quick brown fox jumps over the lazy dog every single day"}'
			);
		});
	});
});
