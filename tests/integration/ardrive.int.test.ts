import { expect } from 'chai';
import { SinonStubbedInstance, stub } from 'sinon';
import { arDriveFactory } from '../../src';
import { ArDrive } from '../../src/ardrive';
import { TipType } from '../../src/types';
import { readJWKFile } from '../../src/utils';
import { ArweaveOracle } from '../../src/utils/arweave_oracle';
import { ARDataPriceRegressionEstimator } from '../../src/utils/ar_data_price_regression_estimator';
import { GatewayOracle } from '../../src/utils/gateway_oracle';

describe('ArDrive class', () => {
	let arDrive: ArDrive;
	let spyedOracle: SinonStubbedInstance<ArweaveOracle>;
	let calculator: ARDataPriceRegressionEstimator;
	const wallet = readJWKFile('./test_wallet.json');

	before(() => {
		// Set pricing algo up as x = y (bytes = Winston)
		spyedOracle = stub(new GatewayOracle());
		spyedOracle.getWinstonPriceForByteCount.callsFake((input) => Promise.resolve(input));
		calculator = new ARDataPriceRegressionEstimator(true, spyedOracle);
		arDrive = arDriveFactory({
			wallet: wallet,
			priceEstimator: new ARDataPriceRegressionEstimator(),
			feeMultiple: 1.0,
			dryRun: true
		});
	});

	// TODO: Move these to unit test file
	describe('encryptedDataSize function', () => {
		it('throws an error when passed a negative value', () => {
			expect(() => arDrive.encryptedDataSize(-1)).to.throw(Error);
		});

		it('throws an error when passed a non-integer value', () => {
			expect(() => arDrive.encryptedDataSize(0.5)).to.throw(Error);
		});

		it('throws an error when passed a value too large for computation', () => {
			expect(() => arDrive.encryptedDataSize(Number.MAX_SAFE_INTEGER - 15)).to.throw(Error);
		});

		it('returns the expected values for valid inputs', () => {
			const inputsAndExpectedOutputs = [
				[0, 16],
				[1, 16],
				[15, 16],
				[16, 32],
				[17, 32],
				[Number.MAX_SAFE_INTEGER - 16, Number.MAX_SAFE_INTEGER - 15]
			];
			inputsAndExpectedOutputs.forEach(([input, expectedOutput]) => {
				expect(arDrive.encryptedDataSize(input)).to.equal(expectedOutput);
			});
		});
	});

	// TODO: Move these to unit test file
	describe('getTipTags function', () => {
		it('returns the expected tags', () => {
			const baseTags = [
				{ name: 'App-Name', value: 'ArDrive-CLI' },
				{ name: 'App-Version', value: '2.0' }
			];
			const inputsAndExpectedOutputs = [
				[undefined, [...baseTags, { name: 'Tip-Type', value: 'data upload' }]],
				['data upload', [...baseTags, { name: 'Tip-Type', value: 'data upload' }]]
			];
			inputsAndExpectedOutputs.forEach(([input, expectedOutput]) => {
				expect(arDrive.getTipTags(input as TipType)).to.deep.equal(expectedOutput);
			});
		});
	});
});
