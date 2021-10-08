import Arweave from 'arweave';
import { expect } from 'chai';
import { SinonSpiedInstance, SinonStubbedInstance, spy, stub } from 'sinon';
import { arDriveFactory } from '../../src';
import { ArDrive, ArFSResult, PrivateDriveKeyData, stubEntityID } from '../../src/ardrive';
import { readJWKFile, urlEncodeHashKey } from '../../src/utils';
import { ArweaveOracle } from '../../src/utils/arweave_oracle';
import { ARDataPriceRegressionEstimator } from '../../src/utils/ar_data_price_regression_estimator';
import { GatewayOracle } from '../../src/utils/gateway_oracle';
import { JWKWallet, WalletDAO } from '../../src/wallet_new';
import { ArDriveCommunityOracle } from '../../src/community/ardrive_community_oracle';
import { CommunityOracle } from '../../src/community/community_oracle';
import { ArFSDAO } from '../../src/arfsdao';
import { deriveDriveKey } from 'ardrive-core-js';

const entityIdRegex = /^([a-f]|[0-9]){8}-([a-f]|[0-9]){4}-([a-f]|[0-9]){4}-([a-f]|[0-9]){4}-([a-f]|[0-9]){12}$/;
const expectedTrxIdLength = 43;

describe('ArDrive class', () => {
	let arDrive: ArDrive;
	let arweaveOracleStub: SinonStubbedInstance<ArweaveOracle>;
	let communityOracleStub: SinonStubbedInstance<CommunityOracle>;
	let priceEstimator: ARDataPriceRegressionEstimator;
	let walletDao: SinonStubbedInstance<WalletDAO>;
	let fakeArweave: Arweave;
	let mockarfsDao: SinonSpiedInstance<ArFSDAO>;
	const wallet = readJWKFile('./test_wallet.json');
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
		walletDao = stub(new WalletDAO(fakeArweave, 'Integration Test', '1.0'));
		mockarfsDao = spy(new ArFSDAO(wallet, fakeArweave, true, 'Integration Test', '1.0'));
		const unknownWalletDao = walletDao as unknown;
		const unknownArfsDao = mockarfsDao as unknown;
		arDrive = arDriveFactory({
			wallet: wallet,
			priceEstimator: priceEstimator,
			communityOracle: communityOracleStub,
			feeMultiple: 1.0,
			dryRun: true,
			arweave: fakeArweave,
			walletDao: unknownWalletDao as WalletDAO,
			arfsDao: unknownArfsDao as ArFSDAO
		});
	});

	describe('sendCommunityTip function', () => {
		it('returns the correct TipResult', async () => {
			communityOracleStub.selectTokenHolder.callsFake(() => {
				return Promise.resolve(stubArweaveAddress);
			});
			const result = await arDrive.sendCommunityTip('12345');

			// Can't know the txID ahead of time without mocking arweave deeply
			expect(result.tipData.txId.length).to.equal(expectedTrxIdLength);
			expect(result.tipData.recipient).to.equal(stubArweaveAddress);
			expect(result.tipData.winston).to.equal('12345');
			expect(result.reward).to.equal('0');
		});
	});

	describe('createPublicDrive function', () => {
		it('returns the correct ArFSResult', async () => {
			walletDao.walletHasBalance.callsFake(() => {
				return Promise.resolve(true);
			});
			const result = await arDrive.createPublicDrive('TEST_DRIVE');
			assertCreateDriveExpectations(result, 75, 21);
		});
	});

	describe('createPrivateDrive function', () => {
		it('returns the correct ArFSResult', async () => {
			walletDao.walletHasBalance.callsFake(() => {
				return Promise.resolve(true);
			});

			const stubDriveKey = await deriveDriveKey(
				'stubPassword',
				stubEntityID,
				JSON.stringify((wallet as JWKWallet).getPrivateKey())
			);
			const stubPrivateDriveData: PrivateDriveKeyData = { driveId: stubEntityID, driveKey: stubDriveKey };

			const result = await arDrive.createPrivateDrive('TEST_DRIVE', stubPrivateDriveData);
			assertCreateDriveExpectations(result, 91, 37, urlEncodeHashKey(stubDriveKey));
		});
	});
});

function assertCreateDriveExpectations(
	result: ArFSResult,
	driveFee: number,
	folderFee: number,
	expectedDriveKey?: string
) {
	// Ensure that 2 arfs entities were created
	expect(result.created.length).to.equal(2);

	// Ensure that the drive entity looks healthy
	expect(result.created[0].dataTxId).to.be.undefined;
	expect(result.created[0].entityId).to.match(entityIdRegex);
	expect(result.created[0].key).to.equal(expectedDriveKey);
	expect(result.created[0].metadataTxId.length).to.equal(expectedTrxIdLength);
	expect(result.created[0].type).to.equal('drive');

	// Ensure that the root folder entity looks healthy
	expect(result.created[1].dataTxId).to.be.undefined;
	expect(result.created[1].entityId).to.match(entityIdRegex);
	expect(result.created[1].key).to.equal(expectedDriveKey);
	expect(result.created[1].metadataTxId.length).to.equal(expectedTrxIdLength);
	expect(result.created[1].type).to.equal('folder');

	// There should be no tips
	expect(result.tips).to.be.empty;
	expect(result.created[1].entityId).to.match(entityIdRegex);

	// Ensure that the fees look healthy
	expect(Object.keys(result.fees).length).to.equal(2);
	expect(Object.keys(result.fees)[0].length).to.equal(expectedTrxIdLength);
	expect(Object.values(result.fees)[0]).to.equal(driveFee);
	expect(Object.keys(result.fees)[1].length).to.equal(expectedTrxIdLength);
	expect(Object.values(result.fees)[1]).to.equal(folderFee);
}
