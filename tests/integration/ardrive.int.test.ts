import Arweave from 'arweave';
import { expect } from 'chai';
import { SinonStubbedInstance, stub } from 'sinon';
import { arDriveFactory } from '../../src';
import { ArDrive, stubEntityID, stubTransactionID } from '../../src/ardrive';
import {
	ArFSPublicDriveTransactionData,
	ArFSPublicFileMetadataTransactionData,
	ArFSPublicFolderTransactionData
} from '../../src/arfs_trx_data_types';
import { TipType } from '../../src/types';
import { readJWKFile } from '../../src/utils';
import { ArweaveOracle } from '../../src/utils/arweave_oracle';
import { ARDataPriceRegressionEstimator } from '../../src/utils/ar_data_price_regression_estimator';
import { GatewayOracle } from '../../src/utils/gateway_oracle';
import { WalletDAO } from '../../src/wallet_new';
import { expectAsyncErrorThrow } from '../../src/utils/test_helpers';
import { ArDriveCommunityOracle } from '../../src/community/ardrive_community_oracle';
import { CommunityOracle } from '../../src/community/community_oracle';

describe('ArDrive class', () => {
	let arDrive: ArDrive;
	let arweaveOracleStub: SinonStubbedInstance<ArweaveOracle>;
	let communityOracleStub: SinonStubbedInstance<CommunityOracle>;
	let priceEstimator: ARDataPriceRegressionEstimator;
	let walletDao: SinonStubbedInstance<WalletDAO>;
	const fakeArweave = Arweave.init({
		host: 'localhost',
		port: 443,
		protocol: 'https',
		timeout: 600000
	});
	const wallet = readJWKFile('./test_wallet.json');
	const stubPublicFileTransactionData = new ArFSPublicFileMetadataTransactionData(
		'stubName',
		12345,
		0,
		stubTransactionID,
		'application/json'
	);
	const stubPublicFolderTransactionData = new ArFSPublicFolderTransactionData('stubName');
	const stubPublicDriveMetadataTransactionData = new ArFSPublicDriveTransactionData('stubName', stubEntityID);

	beforeEach(async () => {
		// Set pricing algo up as x = y (bytes = Winston)
		arweaveOracleStub = stub(new GatewayOracle());
		arweaveOracleStub.getWinstonPriceForByteCount.callsFake((input) => Promise.resolve(input));
		communityOracleStub = stub(new ArDriveCommunityOracle(fakeArweave));
		priceEstimator = new ARDataPriceRegressionEstimator(true, arweaveOracleStub);
		walletDao = stub(new WalletDAO(fakeArweave, 'Integration Test', '1.0'));
		walletDao.walletHasBalance.callsFake(() => {
			return Promise.resolve(true);
		});
		const unknownDao = walletDao as unknown;
		arDrive = arDriveFactory({
			wallet: wallet,
			priceEstimator: priceEstimator,
			communityOracle: communityOracleStub,
			feeMultiple: 1.0,
			dryRun: true,
			arweave: fakeArweave,
			walletDao: unknownDao as WalletDAO
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

	// TODO: Move these to unit test file
	describe('estimateAndAssertCostOfFileUpload function', () => {
		it('throws an error when decryptedFileSize is negative', async () => {
			await expectAsyncErrorThrow(() =>
				arDrive.estimateAndAssertCostOfFileUpload(-1, stubPublicFileTransactionData, 'private')
			);
		});

		it('throws an error when decryptedFileSize is not an integer', async () => {
			await expectAsyncErrorThrow(() =>
				arDrive.estimateAndAssertCostOfFileUpload(0.1, stubPublicFileTransactionData, 'private')
			);
		});

		it('throws an error when there is an insufficient wallet balance', async () => {
			walletDao.walletHasBalance.callsFake(() => {
				return Promise.resolve(false);
			});
			walletDao.getWalletWinstonBalance.callsFake(() => {
				return Promise.resolve(0);
			});
			await expectAsyncErrorThrow(() =>
				arDrive.estimateAndAssertCostOfFileUpload(1, stubPublicFileTransactionData, 'private')
			);
		});

		it('returns the correct reward and tip data', async () => {
			walletDao.walletHasBalance.callsFake(() => {
				return Promise.resolve(true);
			});
			communityOracleStub.getCommunityWinstonTip.callsFake(() => {
				return Promise.resolve('98765');
			});

			const actual = await arDrive.estimateAndAssertCostOfFileUpload(
				1234567,
				stubPublicFileTransactionData,
				'private'
			);
			expect(actual).to.deep.equal({
				metaDataBaseReward: '147',
				fileDataBaseReward: '1234576',
				communityWinstonTip: '98765'
			});
		});
	});

	// TODO: Move these to unit test file
	describe('estimateAndAssertCostOfFolderUpload function', () => {
		it('throws an error when there is an insufficient wallet balance', async () => {
			walletDao.walletHasBalance.callsFake(() => {
				return Promise.resolve(false);
			});
			walletDao.getWalletWinstonBalance.callsFake(() => {
				return Promise.resolve(0);
			});
			await expectAsyncErrorThrow(() =>
				arDrive.estimateAndAssertCostOfFolderUpload(stubPublicFolderTransactionData)
			);
		});

		it('returns the correct reward data', async () => {
			walletDao.walletHasBalance.callsFake(() => {
				return Promise.resolve(true);
			});

			const actual = await arDrive.estimateAndAssertCostOfFolderUpload(stubPublicFileTransactionData);
			expect(actual).to.deep.equal({
				metaDataBaseReward: '147'
			});
		});
	});

	// TODO: Move these to unit test file
	describe('estimateAndAssertCostOfDriveCreation function', () => {
		it('throws an error when there is an insufficient wallet balance', async () => {
			walletDao.walletHasBalance.callsFake(() => {
				return Promise.resolve(false);
			});
			walletDao.getWalletWinstonBalance.callsFake(() => {
				return Promise.resolve(0);
			});
			await expectAsyncErrorThrow(() =>
				arDrive.estimateAndAssertCostOfDriveCreation(
					stubPublicDriveMetadataTransactionData,
					stubPublicFolderTransactionData
				)
			);
		});

		it('returns the correct reward data', async () => {
			walletDao.walletHasBalance.callsFake(() => {
				return Promise.resolve(true);
			});

			const actual = await arDrive.estimateAndAssertCostOfDriveCreation(
				stubPublicDriveMetadataTransactionData,
				stubPublicFolderTransactionData
			);
			expect(actual).to.deep.equal({
				driveMetaDataBaseReward: '73',
				rootFolderMetaDataBaseReward: '19'
			});
		});
	});

	// TODO: Move these to unit test file
	describe('estimateAndAssertCostOfMoveFile function', () => {
		it('throws an error when there is an insufficient wallet balance', async () => {
			walletDao.walletHasBalance.callsFake(() => {
				return Promise.resolve(false);
			});
			walletDao.getWalletWinstonBalance.callsFake(() => {
				return Promise.resolve(0);
			});
			await expectAsyncErrorThrow(() => arDrive.estimateAndAssertCostOfMoveFile(stubPublicFileTransactionData));
		});

		it('returns the correct reward data', async () => {
			walletDao.walletHasBalance.callsFake(() => {
				return Promise.resolve(true);
			});

			const actual = await arDrive.estimateAndAssertCostOfMoveFile(stubPublicFileTransactionData);
			expect(actual).to.deep.equal({
				metaDataBaseReward: '147'
			});
		});
	});
});
