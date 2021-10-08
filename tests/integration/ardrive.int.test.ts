import Arweave from 'arweave';
import { expect } from 'chai';
import { SinonStubbedInstance, stub } from 'sinon';
import { arDriveFactory } from '../../src';
import { ArDrive } from '../../src/ardrive';
// import {
// 	ArFSPublicDriveTransactionData,
// 	ArFSPublicFileMetadataTransactionData,
// 	ArFSPublicFolderTransactionData
// } from '../../src/arfs_trx_data_types';
import { readJWKFile } from '../../src/utils';
import { ArweaveOracle } from '../../src/utils/arweave_oracle';
import { ARDataPriceRegressionEstimator } from '../../src/utils/ar_data_price_regression_estimator';
import { GatewayOracle } from '../../src/utils/gateway_oracle';
import { WalletDAO } from '../../src/wallet_new';
//import { expectAsyncErrorThrow } from '../../src/utils/test_helpers';
import { ArDriveCommunityOracle } from '../../src/community/ardrive_community_oracle';
import { CommunityOracle } from '../../src/community/community_oracle';

describe('ArDrive class', () => {
	let arDrive: ArDrive;
	let arweaveOracleStub: SinonStubbedInstance<ArweaveOracle>;
	let communityOracleStub: SinonStubbedInstance<CommunityOracle>;
	let priceEstimator: ARDataPriceRegressionEstimator;
	let walletDao: WalletDAO;
	let fakeArweave: Arweave;
	const wallet = readJWKFile('./test_wallet.json');
	/*	const stubPublicFileTransactionData = new ArFSPublicFileMetadataTransactionData(
		'stubName',
		12345,
		0,
		stubTransactionID,
		'application/json'
	);
	const stubPublicFolderTransactionData = new ArFSPublicFolderTransactionData('stubName');
	const stubPublicDriveMetadataTransactionData = new ArFSPublicDriveTransactionData('stubName', stubEntityID);*/
	const stubArweaveAddress = 'abcdefghijklmnopqrxtuvwxyz123456789ABCDEFGH';

	beforeEach(async () => {
		// Set pricing algo up as x = y (bytes = Winston)
		arweaveOracleStub = stub(new GatewayOracle());
		arweaveOracleStub.getWinstonPriceForByteCount.callsFake((input) => Promise.resolve(input));
		fakeArweave = Arweave.init({
			host: 'localhost',
			port: 443,
			protocol: 'https',
			timeout: 600000
		});
		communityOracleStub = stub(new ArDriveCommunityOracle(fakeArweave));
		priceEstimator = new ARDataPriceRegressionEstimator(true, arweaveOracleStub);
		walletDao = new WalletDAO(fakeArweave, 'Integration Test', '1.0');
		/*walletDao.walletHasBalance.callsFake(() => {
			return Promise.resolve(true);
		});*/
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

	describe('sendCommunityTip function', () => {
		it('returns the correct TipResult', async () => {
			communityOracleStub.selectTokenHolder.callsFake(() => {
				return Promise.resolve(stubArweaveAddress);
			});
			const result = await arDrive.sendCommunityTip('12345');

			// Can't know the txID ahead of time without mocking arweave deeply
			expect(result.tipData.txId.length).to.equal(43);
			expect(result.tipData.recipient).to.equal(stubArweaveAddress);
			expect(result.tipData.winston).to.equal('12345');
			expect(result.reward).to.equal('0');
		});
	});
});
