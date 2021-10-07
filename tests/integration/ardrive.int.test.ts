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
});
