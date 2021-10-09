import Arweave from 'arweave';
import { expect } from 'chai';
import { stub } from 'sinon';
import { arDriveFactory } from '../../src';
import { ArFSResult, PrivateDriveKeyData, stubEntityID, stubTransactionID } from '../../src/ardrive';
import { readJWKFile, urlEncodeHashKey } from '../../src/utils';
import { ARDataPriceRegressionEstimator } from '../../src/utils/ar_data_price_regression_estimator';
import { GatewayOracle } from '../../src/utils/gateway_oracle';
import { JWKWallet, WalletDAO } from '../../src/wallet_new';
import { ArDriveCommunityOracle } from '../../src/community/ardrive_community_oracle';
import { ArFSDAO, ArFSPrivateDrive, ArFSPrivateFolder, ArFSPublicDrive, ArFSPublicFolder } from '../../src/arfsdao';
import { deriveDriveKey } from 'ardrive-core-js';
import { ArFS_O_11, DriveKey } from '../../src/types';

const entityIdRegex = /^([a-f]|[0-9]){8}-([a-f]|[0-9]){4}-([a-f]|[0-9]){4}-([a-f]|[0-9]){4}-([a-f]|[0-9]){12}$/;
const expectedTrxIdLength = 43;

describe('ArDrive class', () => {
	const wallet = readJWKFile('./test_wallet.json');
	const stubArweaveAddress = 'abcdefghijklmnopqrxtuvwxyz123456789ABCDEFGH';
	const getStubDriveKey = async (): Promise<DriveKey> => {
		return deriveDriveKey('stubPassword', stubEntityID, JSON.stringify((wallet as JWKWallet).getPrivateKey()));
	};
	const stubPublicDrive = new ArFSPublicDrive(
		'Integration Test',
		'1.0',
		ArFS_O_11,
		'application/json',
		stubEntityID,
		'drive',
		'STUB DRIVE',
		stubTransactionID,
		0,
		'public',
		stubEntityID
	);
	const stubPrivateDrive = new ArFSPrivateDrive(
		'Integration Test',
		'1.0',
		ArFS_O_11,
		'application/octet-stream',
		stubEntityID,
		'drive',
		'STUB DRIVE',
		stubTransactionID,
		0,
		'public',
		stubEntityID,
		'password',
		'stubCipher',
		'stubIV'
	);
	const stubPublicFolder = new ArFSPublicFolder(
		'Integration Test',
		'1.0',
		ArFS_O_11,
		'application/json',
		stubEntityID,
		'folder',
		'STUB NAME',
		stubTransactionID,
		0,
		stubEntityID,
		stubEntityID
	);
	const stubPrivateFolder = new ArFSPrivateFolder(
		'Integration Test',
		'1.0',
		ArFS_O_11,
		'application/json',
		stubEntityID,
		'folder',
		'STUB NAME',
		stubTransactionID,
		0,
		stubEntityID,
		stubEntityID,
		'stubCipher',
		'stubIV'
	);

	const fakeArweave = Arweave.init({
		host: 'localhost',
		port: 443,
		protocol: 'https',
		timeout: 600000
	});

	const arweaveOracle = new GatewayOracle();
	const communityOracle = new ArDriveCommunityOracle(fakeArweave);
	const priceEstimator = new ARDataPriceRegressionEstimator(true, arweaveOracle);
	const walletDao = new WalletDAO(fakeArweave, 'Integration Test', '1.0');
	const arfsDao = new ArFSDAO(wallet, fakeArweave, true, 'Integration Test', '1.0');

	const arDrive = arDriveFactory({
		wallet: wallet,
		priceEstimator: priceEstimator,
		communityOracle: communityOracle,
		feeMultiple: 1.0,
		dryRun: true,
		arweave: fakeArweave,
		walletDao,
		arfsDao
	});

	beforeEach(async () => {
		// Set pricing algo up as x = y (bytes = Winston)
		stub(arweaveOracle, 'getWinstonPriceForByteCount').callsFake((input) => Promise.resolve(input));
	});

	describe('utility function', () => {
		describe('sendCommunityTip', () => {
			it('returns the correct TipResult', async () => {
				stub(communityOracle, 'selectTokenHolder').callsFake(() => {
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
	});

	describe('drive function', () => {
		describe('createPublicDrive', () => {
			it('returns the correct ArFSResult', async () => {
				stub(walletDao, 'walletHasBalance').callsFake(() => {
					return Promise.resolve(true);
				});

				const result = await arDrive.createPublicDrive('TEST_DRIVE');
				assertCreateDriveExpectations(result, 75, 21);
			});
		});

		describe('createPrivateDrive', () => {
			it('returns the correct ArFSResult', async () => {
				stub(walletDao, 'walletHasBalance').callsFake(() => {
					return Promise.resolve(true);
				});

				const stubDriveKey = await getStubDriveKey();
				const stubPrivateDriveData: PrivateDriveKeyData = {
					driveId: stubEntityID,
					driveKey: stubDriveKey
				};

				const result = await arDrive.createPrivateDrive('TEST_DRIVE', stubPrivateDriveData);
				assertCreateDriveExpectations(result, 91, 37, urlEncodeHashKey(stubDriveKey));
			});
		});
	});

	describe('folder function', () => {
		describe('createPublicFolder', () => {
			it('returns the correct ArFSResult', async () => {
				stub(walletDao, 'walletHasBalance').callsFake(() => {
					return Promise.resolve(true);
				});
				stub(arfsDao, 'getDriveIdForFolderId').callsFake(() => {
					return Promise.resolve(stubEntityID);
				});
				stub(arfsDao, 'getPublicDrive').callsFake(() => {
					return Promise.resolve(stubPublicDrive);
				});

				const result = await arDrive.createPublicFolder({ folderName: 'TEST_FOLDER', driveId: stubEntityID });
				assertCreateFolderExpectations(result, 22);
			});
		});

		describe('createPrivateFolder', () => {
			it('returns the correct ArFSResult', async () => {
				stub(walletDao, 'walletHasBalance').callsFake(() => {
					return Promise.resolve(true);
				});
				stub(arfsDao, 'getDriveIdForFolderId').callsFake(() => {
					return Promise.resolve(stubEntityID);
				});
				stub(arfsDao, 'getPrivateDrive').callsFake(() => {
					return Promise.resolve(stubPrivateDrive);
				});
				const stubDriveKey = await getStubDriveKey();
				const result = await arDrive.createPrivateFolder({
					folderName: 'TEST_FOLDER',
					driveId: stubEntityID,
					driveKey: stubDriveKey
				});
				assertCreateFolderExpectations(result, 38, urlEncodeHashKey(stubDriveKey));
			});
		});

		describe('movePublicFolder', () => {
			it('returns the correct ArFSResult', async () => {
				stub(walletDao, 'walletHasBalance').callsFake(() => {
					return Promise.resolve(true);
				});
				stub(arfsDao, 'getDriveIdForFolderId').callsFake(() => {
					return Promise.resolve(stubEntityID);
				});
				stub(arfsDao, 'getPublicDrive').callsFake(() => {
					return Promise.resolve(stubPublicDrive);
				});
				stub(arfsDao, 'getPublicFolder').callsFake(() => {
					return Promise.resolve(stubPublicFolder);
				});

				// TODO: SHOULD WE ALLOW MOVE TO SELF?
				const result = await arDrive.movePublicFolder({
					folderId: stubEntityID,
					newParentFolderId: stubEntityID
				});
				assertCreateFolderExpectations(result, 20);
			});
		});

		describe('movePrivateFolder', () => {
			it('returns the correct ArFSResult', async () => {
				stub(walletDao, 'walletHasBalance').callsFake(() => {
					return Promise.resolve(true);
				});
				stub(arfsDao, 'getDriveIdForFolderId').callsFake(() => {
					return Promise.resolve(stubEntityID);
				});
				stub(arfsDao, 'getPrivateDrive').callsFake(() => {
					return Promise.resolve(stubPrivateDrive);
				});
				stub(arfsDao, 'getPrivateFolder').callsFake(() => {
					return Promise.resolve(stubPrivateFolder);
				});
				const stubDriveKey = await getStubDriveKey();
				// TODO: SHOULD WE ALLOW MOVE TO SELF?
				const result = await arDrive.movePrivateFolder({
					folderId: stubEntityID,
					newParentFolderId: stubEntityID,
					driveKey: stubDriveKey
				});
				assertCreateFolderExpectations(result, 36, urlEncodeHashKey(stubDriveKey));
			});
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

	// Ensure that the fees look healthy
	expect(Object.keys(result.fees).length).to.equal(2);
	expect(Object.keys(result.fees)[0].length).to.equal(expectedTrxIdLength);
	expect(Object.values(result.fees)[0]).to.equal(driveFee);
	expect(Object.keys(result.fees)[1].length).to.equal(expectedTrxIdLength);
	expect(Object.values(result.fees)[1]).to.equal(folderFee);
}

function assertCreateFolderExpectations(result: ArFSResult, folderFee: number, expectedDriveKey?: string) {
	// Ensure that 1 arfs entity was created
	expect(result.created.length).to.equal(1);

	// Ensure that the folder entity looks healthy
	expect(result.created[0].dataTxId).to.be.undefined;
	expect(result.created[0].entityId).to.match(entityIdRegex);
	expect(result.created[0].key).to.equal(expectedDriveKey);
	expect(result.created[0].metadataTxId.length).to.equal(expectedTrxIdLength);
	expect(result.created[0].type).to.equal('folder');

	// There should be no tips
	expect(result.tips).to.be.empty;

	// Ensure that the fees look healthy
	expect(Object.keys(result.fees).length).to.equal(1);
	expect(Object.keys(result.fees)[0].length).to.equal(expectedTrxIdLength);
	expect(Object.values(result.fees)[0]).to.equal(folderFee);
}
