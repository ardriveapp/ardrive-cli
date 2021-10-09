import Arweave from 'arweave';
import { expect } from 'chai';
import { stub } from 'sinon';
import { ArDrive, ArFSResult, PrivateDriveKeyData, stubEntityID, stubTransactionID } from '../../src/ardrive';
import { readJWKFile, urlEncodeHashKey } from '../../src/utils';
import { ARDataPriceRegressionEstimator } from '../../src/utils/ar_data_price_regression_estimator';
import { GatewayOracle } from '../../src/utils/gateway_oracle';
import { JWKWallet, WalletDAO } from '../../src/wallet_new';
import { ArDriveCommunityOracle } from '../../src/community/ardrive_community_oracle';
import {
	ArFSDAO,
	ArFSPrivateDrive,
	ArFSPrivateFile,
	ArFSPrivateFolder,
	ArFSPublicDrive,
	ArFSPublicFile,
	ArFSPublicFolder
} from '../../src/arfsdao';
import { deriveDriveKey, DrivePrivacy } from 'ardrive-core-js';
import { ArFS_O_11, DriveKey, Winston } from '../../src/types';
import { ArFSFileToUpload, wrapFileOrFolder } from '../../src/arfs_file_wrapper';

const entityIdRegex = /^([a-f]|[0-9]){8}-([a-f]|[0-9]){4}-([a-f]|[0-9]){4}-([a-f]|[0-9]){4}-([a-f]|[0-9]){12}$/;
const trxIdRegex = /^([a-zA-Z]|[0-9]|-|_){43}$/;
const fileKeyRegex = /^([a-zA-Z]|[0-9]|-|_|\/|\+){43}$/;

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
	const stubPublicFile = new ArFSPublicFile(
		'Integration Test',
		'1.0',
		ArFS_O_11,
		'application/json',
		stubEntityID,
		'file',
		'STUB NAME',
		stubTransactionID,
		0,
		stubEntityID,
		stubEntityID,
		1234567890,
		0,
		stubTransactionID,
		'application/json'
	);
	const stubPrivateFile = new ArFSPrivateFile(
		'Integration Test',
		'1.0',
		ArFS_O_11,
		'application/json',
		stubEntityID,
		'file',
		'STUB NAME',
		stubTransactionID,
		0,
		stubEntityID,
		stubEntityID,
		1234567890,
		0,
		stubTransactionID,
		'application/json',
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

	const arDrive = new ArDrive(
		wallet,
		walletDao,
		arfsDao,
		communityOracle,
		'Integration Test',
		'1.0',
		priceEstimator,
		1.0,
		true
	);

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
				expect(result.tipData.txId).to.match(trxIdRegex);
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

	describe('file function', () => {
		describe('uploadPublicFile', () => {
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
				const wrappedFile = wrapFileOrFolder('test_wallet.json');
				const result = await arDrive.uploadPublicFile(
					stubEntityID,
					new ArFSFileToUpload('test_wallet.json', wrappedFile.fileStats)
				);
				assertUploadFileExpectations(result, 3204, 166, 0, '10000000', 'public');
			});
		});

		describe('uploadPrivateFile', () => {
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
				const wrappedFile = wrapFileOrFolder('test_wallet.json');
				const stubDriveKey = await getStubDriveKey();
				const result = await arDrive.uploadPrivateFile(
					stubEntityID,
					new ArFSFileToUpload('test_wallet.json', wrappedFile.fileStats),
					stubDriveKey
				);
				assertUploadFileExpectations(result, 3216, 182, 0, '10000000', 'private');
			});
		});

		describe('movePublicFile', () => {
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
				stub(arfsDao, 'getPublicFile').callsFake(() => {
					return Promise.resolve(stubPublicFile);
				});

				const result = await arDrive.movePublicFile(stubEntityID, stubEntityID);
				assertMoveFileExpectations(result, 153, 'public');
			});
		});

		describe('movePrivateFile', () => {
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
				stub(arfsDao, 'getPrivateFile').callsFake(() => {
					return Promise.resolve(stubPrivateFile);
				});
				const stubDriveKey = await getStubDriveKey();
				const result = await arDrive.movePrivateFile(stubEntityID, stubEntityID, stubDriveKey);
				assertMoveFileExpectations(result, 169, 'private');
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
	const driveEntity = result.created[0];
	expect(driveEntity.dataTxId).to.be.undefined;
	expect(driveEntity.entityId).to.match(entityIdRegex);
	expect(driveEntity.key).to.equal(expectedDriveKey);
	expect(driveEntity.metadataTxId).to.match(trxIdRegex);
	expect(driveEntity.type).to.equal('drive');

	// Ensure that the root folder entity looks healthy
	const rootFolderEntity = result.created[1];
	expect(rootFolderEntity.dataTxId).to.be.undefined;
	expect(rootFolderEntity.entityId).to.match(entityIdRegex);
	expect(rootFolderEntity.key).to.equal(expectedDriveKey);
	expect(rootFolderEntity.metadataTxId).to.match(trxIdRegex);
	expect(rootFolderEntity.type).to.equal('folder');

	// There should be no tips
	expect(result.tips).to.be.empty;

	// Ensure that the fees look healthy
	const feeKeys = Object.keys(result.fees);
	expect(feeKeys.length).to.equal(2);
	expect(feeKeys[0]).to.equal(driveEntity.metadataTxId);
	expect(feeKeys[0]).to.match(trxIdRegex);
	expect(result.fees[driveEntity.metadataTxId]).to.equal(driveFee);
	expect(feeKeys[1]).to.equal(rootFolderEntity.metadataTxId);
	expect(feeKeys[1]).to.match(trxIdRegex);
	expect(result.fees[rootFolderEntity.metadataTxId]).to.equal(folderFee);
}

function assertCreateFolderExpectations(result: ArFSResult, folderFee: number, expectedDriveKey?: string) {
	// Ensure that 1 arfs entity was created
	expect(result.created.length).to.equal(1);

	// Ensure that the folder entity looks healthy
	const folderEntity = result.created[0];
	expect(folderEntity.dataTxId).to.be.undefined;
	expect(folderEntity.entityId).to.match(entityIdRegex);
	expect(folderEntity.key).to.equal(expectedDriveKey);
	expect(folderEntity.metadataTxId).to.match(trxIdRegex);
	expect(folderEntity.type).to.equal('folder');

	// There should be no tips
	expect(result.tips).to.be.empty;

	// Ensure that the fees look healthy
	const feeKeys = Object.keys(result.fees);
	expect(feeKeys.length).to.equal(1);
	expect(feeKeys[0]).to.match(trxIdRegex);
	expect(feeKeys[0]).to.equal(folderEntity.metadataTxId);
	expect(result.fees[folderEntity.metadataTxId]).to.equal(folderFee);
}

function assertUploadFileExpectations(
	result: ArFSResult,
	fileFee: number,
	metadataFee: number,
	tipFee: number,
	expectedTip: Winston,
	drivePrivacy: DrivePrivacy
) {
	// Ensure that 1 arfs entity was created
	expect(result.created.length).to.equal(1);

	// Ensure that the file data entity looks healthy
	const fileEntity = result.created[0];
	expect(fileEntity.dataTxId).to.match(trxIdRegex);
	expect(fileEntity.entityId).to.match(entityIdRegex);
	switch (drivePrivacy) {
		case 'public':
			expect(fileEntity.key).to.equal(undefined);
			break;
		case 'private':
			expect(fileEntity.key).to.match(fileKeyRegex);
	}
	expect(fileEntity.metadataTxId).to.match(trxIdRegex);
	expect(fileEntity.type).to.equal('file');

	// There should be 1 tip
	expect(result.tips.length).to.equal(1);
	const uploadTip = result.tips[0];
	expect(uploadTip.txId).to.match(trxIdRegex);
	expect(uploadTip.winston).to.equal(expectedTip);
	expect(uploadTip.recipient).to.match(trxIdRegex);

	// Ensure that the fees look healthy
	expect(Object.keys(result.fees).length).to.equal(3);

	const feeKeys = Object.keys(result.fees);
	expect(feeKeys[0]).to.match(trxIdRegex);
	expect(feeKeys[0]).to.equal(fileEntity.dataTxId);
	expect(result.fees[fileEntity.dataTxId]).to.equal(fileFee);

	expect(feeKeys[1]).to.match(trxIdRegex);
	expect(feeKeys[1]).to.equal(fileEntity.metadataTxId);
	expect(result.fees[fileEntity.metadataTxId]).to.equal(metadataFee);

	expect(feeKeys[2]).to.match(trxIdRegex);
	expect(feeKeys[2]).to.equal(uploadTip.txId);
	expect(result.fees[uploadTip.txId]).to.equal(tipFee);
}

function assertMoveFileExpectations(result: ArFSResult, fileFee: number, drivePrivacy: DrivePrivacy) {
	// Ensure that 1 arfs entity was created
	expect(result.created.length).to.equal(1);

	// Ensure that the file entity looks healthy
	const fileEntity = result.created[0];
	expect(fileEntity.dataTxId).to.match(trxIdRegex);
	expect(fileEntity.entityId).to.match(entityIdRegex);
	switch (drivePrivacy) {
		case 'public':
			expect(fileEntity.key).to.equal(undefined);
			break;
		case 'private':
			expect(fileEntity.key).to.match(fileKeyRegex);
	}
	expect(fileEntity.metadataTxId).to.match(trxIdRegex);
	expect(fileEntity.type).to.equal('file');

	// There should be no tips
	expect(result.tips).to.be.empty;

	// Ensure that the fees look healthy
	const feeKeys = Object.keys(result.fees);
	expect(feeKeys.length).to.equal(1);
	expect(feeKeys[0]).to.match(trxIdRegex);
	expect(feeKeys[0]).to.equal(fileEntity.metadataTxId);
	expect(result.fees[fileEntity.metadataTxId]).to.equal(fileFee);
}
