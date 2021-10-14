import Arweave from 'arweave';
import { expect } from 'chai';
import { stub } from 'sinon';
import { ArDrive, ArFSResult } from '../../src/ardrive';
import { readJWKFile, urlEncodeHashKey } from '../../src/utils';
import {
	stubArweaveAddress,
	stubEntityID,
	stubEntityIDAlt,
	stubEntityIDChild,
	stubEntityIDGrandchild,
	stubEntityIDParent,
	stubEntityIDRoot,
	stubPrivateDrive,
	stubPrivateFile,
	stubPrivateFolder,
	stubPublicDrive,
	stubPublicFile,
	stubPublicFolder
} from '../../src/utils/stubs';
import { ARDataPriceRegressionEstimator } from '../../src/utils/ar_data_price_regression_estimator';
import { GatewayOracle } from '../../src/utils/gateway_oracle';
import { JWKWallet, WalletDAO } from '../../src/wallet_new';
import { expectAsyncErrorThrow } from '../../src/utils/test_helpers';
import { ArDriveCommunityOracle } from '../../src/community/ardrive_community_oracle';
import { ArFSDAO, PrivateDriveKeyData } from '../../src/arfsdao';
import { deriveDriveKey, DrivePrivacy } from 'ardrive-core-js';
import { DriveKey, Winston } from '../../src/types';
import { ArFSFileToUpload, wrapFileOrFolder } from '../../src/arfs_file_wrapper';

const entityIdRegex = /^([a-f]|[0-9]){8}-([a-f]|[0-9]){4}-([a-f]|[0-9]){4}-([a-f]|[0-9]){4}-([a-f]|[0-9]){12}$/;
const trxIdRegex = /^([a-zA-Z]|[0-9]|-|_){43}$/;
const fileKeyRegex = /^([a-zA-Z]|[0-9]|-|_|\/|\+){43}$/;

describe('ArDrive class - integrated', () => {
	const wallet = readJWKFile('./test_wallet.json');

	const getStubDriveKey = async (): Promise<DriveKey> => {
		return deriveDriveKey('stubPassword', stubEntityID, JSON.stringify((wallet as JWKWallet).getPrivateKey()));
	};

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

	beforeEach(() => {
		// Set pricing algo up as x = y (bytes = Winston)
		stub(arweaveOracle, 'getWinstonPriceForByteCount').callsFake((input) => Promise.resolve(input));

		// Declare common stubs
		stub(walletDao, 'walletHasBalance').resolves(true);
		stub(arfsDao, 'getDriveIdForFolderId').resolves(stubEntityID);
	});

	describe('utility function', () => {
		describe('sendCommunityTip', () => {
			it('returns the correct TipResult', async () => {
				stub(communityOracle, 'selectTokenHolder').resolves(stubArweaveAddress);

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
				const result = await arDrive.createPublicDrive('TEST_DRIVE');
				assertCreateDriveExpectations(result, 75, 21);
			});
		});

		describe('createPrivateDrive', () => {
			it('returns the correct ArFSResult', async () => {
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
				stub(arfsDao, 'getPublicDrive').resolves(stubPublicDrive);

				const result = await arDrive.createPublicFolder({ folderName: 'TEST_FOLDER', driveId: stubEntityID });
				assertCreateFolderExpectations(result, 22);
			});
		});

		describe('createPrivateFolder', () => {
			it('returns the correct ArFSResult', async () => {
				stub(arfsDao, 'getPrivateDrive').resolves(stubPrivateDrive);
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
			const folderHierarchy = {
				rootFolder: stubPublicFolder(stubEntityIDRoot, 'root folder'),
				parentFolder: stubPublicFolder(stubEntityIDParent, stubEntityIDParent),
				childFolder: stubPublicFolder(stubEntityIDChild, stubEntityIDParent),
				grandChildFolder: stubPublicFolder(stubEntityIDGrandchild, stubEntityIDChild)
			};
			it('throws an error if its being moved inside any of its children folders', async () => {
				stub(arfsDao, 'getPublicFolder').resolves(folderHierarchy.rootFolder);
				stub(arDrive, 'getDriveIdAndAssertDrive').resolves(stubEntityID);
				stub(arfsDao, 'getPublicChildrenFolderIds').resolves([
					folderHierarchy.parentFolder.entityId,
					folderHierarchy.childFolder.entityId,
					folderHierarchy.grandChildFolder.entityId
				]);

				await expectAsyncErrorThrow({
					promiseToError: arDrive.movePublicFolder({
						folderId: folderHierarchy.rootFolder.entityId,
						newParentFolderId: folderHierarchy.grandChildFolder.entityId
					}),
					errorMessage: 'Parent folder cannot be moved inside any of its children folders!'
				});
			});

			it('throws an error if the new parent folder id matches its current parent folder id', async () => {
				stub(arfsDao, 'getPublicFolder').resolves(folderHierarchy.childFolder);
				stub(arDrive, 'getDriveIdAndAssertDrive').resolves(stubEntityID);
				stub(arfsDao, 'getPublicChildrenFolderIds').resolves([folderHierarchy.grandChildFolder.entityId]);

				await expectAsyncErrorThrow({
					promiseToError: arDrive.movePublicFolder({
						folderId: folderHierarchy.childFolder.entityId,
						newParentFolderId: folderHierarchy.parentFolder.entityId
					}),
					errorMessage: `Folder already has parent folder with ID: ${folderHierarchy.parentFolder.entityId}`
				});
			});

			it('throws an error if the new parent folder id matches its own folder id', async () => {
				stub(arfsDao, 'getPublicFolder').resolves(folderHierarchy.parentFolder);
				stub(arDrive, 'getDriveIdAndAssertDrive').resolves(stubEntityID);
				stub(arfsDao, 'getPublicChildrenFolderIds').resolves([
					folderHierarchy.childFolder.entityId,
					folderHierarchy.grandChildFolder.entityId
				]);

				await expectAsyncErrorThrow({
					promiseToError: arDrive.movePublicFolder({
						folderId: folderHierarchy.parentFolder.entityId,
						newParentFolderId: folderHierarchy.parentFolder.entityId
					}),
					errorMessage: 'Folders cannot be moved into themselves!'
				});
			});

			it('throws an error if the folder is being moved to a different drive', async () => {
				stub(arfsDao, 'getPublicFolder').resolves(folderHierarchy.parentFolder);
				stub(arfsDao, 'getPublicChildrenFolderIds').resolves([
					folderHierarchy.childFolder.entityId,
					folderHierarchy.grandChildFolder.entityId
				]);

				stub(arDrive, 'getDriveIdAndAssertDrive').resolves(stubEntityIDAlt); // Returns different Drive ID

				await expectAsyncErrorThrow({
					promiseToError: arDrive.movePublicFolder({
						folderId: folderHierarchy.childFolder.entityId,
						newParentFolderId: folderHierarchy.parentFolder.entityId
					}),
					errorMessage: 'Entity must stay in the same drive!'
				});
			});

			it('returns the correct ArFSResult', async () => {
				stub(arfsDao, 'getPublicFolder').resolves(folderHierarchy.grandChildFolder);
				stub(arDrive, 'getDriveIdAndAssertDrive').resolves(stubEntityID);
				stub(arfsDao, 'getPublicChildrenFolderIds').resolves([]);

				const result = await arDrive.movePublicFolder({
					folderId: folderHierarchy.grandChildFolder.entityId,
					newParentFolderId: folderHierarchy.parentFolder.entityId
				});
				assertCreateFolderExpectations(result, 20);
			});
		});

		describe('movePrivateFolder', () => {
			const folderHierarchy = {
				rootFolder: stubPrivateFolder(stubEntityIDRoot, 'root folder'),
				parentFolder: stubPrivateFolder(stubEntityIDParent, stubEntityIDParent),
				childFolder: stubPrivateFolder(stubEntityIDChild, stubEntityIDParent),
				grandChildFolder: stubPrivateFolder(stubEntityIDGrandchild, stubEntityIDChild)
			};

			it('throws an error if its being moved inside any of its children folders', async () => {
				stub(arfsDao, 'getPrivateFolder').resolves(folderHierarchy.rootFolder);
				stub(arDrive, 'getDriveIdAndAssertDrive').resolves(stubEntityID);
				stub(arfsDao, 'getPrivateChildrenFolderIds').resolves([
					folderHierarchy.parentFolder.entityId,
					folderHierarchy.childFolder.entityId,
					folderHierarchy.grandChildFolder.entityId
				]);

				await expectAsyncErrorThrow({
					promiseToError: arDrive.movePrivateFolder({
						folderId: folderHierarchy.rootFolder.entityId,
						newParentFolderId: folderHierarchy.grandChildFolder.entityId,
						driveKey: await getStubDriveKey()
					}),
					errorMessage: 'Parent folder cannot be moved inside any of its children folders!'
				});
			});

			it('throws an error if the new parent folder id matches its current parent folder id', async () => {
				stub(arfsDao, 'getPrivateFolder').resolves(folderHierarchy.childFolder);
				stub(arDrive, 'getDriveIdAndAssertDrive').resolves(stubEntityID);
				stub(arfsDao, 'getPrivateChildrenFolderIds').resolves([folderHierarchy.grandChildFolder.entityId]);

				await expectAsyncErrorThrow({
					promiseToError: arDrive.movePrivateFolder({
						folderId: folderHierarchy.childFolder.entityId,
						newParentFolderId: folderHierarchy.parentFolder.entityId,
						driveKey: await getStubDriveKey()
					}),
					errorMessage: `Folder already has parent folder with ID: ${folderHierarchy.parentFolder.entityId}`
				});
			});

			it('throws an error if the new parent folder id matches its own folder id', async () => {
				stub(arfsDao, 'getPrivateFolder').resolves(folderHierarchy.parentFolder);
				stub(arDrive, 'getDriveIdAndAssertDrive').resolves(stubEntityID);
				stub(arfsDao, 'getPrivateChildrenFolderIds').resolves([
					folderHierarchy.childFolder.entityId,
					folderHierarchy.grandChildFolder.entityId
				]);

				await expectAsyncErrorThrow({
					promiseToError: arDrive.movePrivateFolder({
						folderId: folderHierarchy.parentFolder.entityId,
						newParentFolderId: folderHierarchy.parentFolder.entityId,
						driveKey: await getStubDriveKey()
					}),
					errorMessage: 'Folders cannot be moved into themselves!'
				});
			});

			it('throws an error if the folder is being moved to a different drive', async () => {
				stub(arfsDao, 'getPrivateFolder').resolves(folderHierarchy.parentFolder);
				stub(arfsDao, 'getPrivateChildrenFolderIds').resolves([
					folderHierarchy.childFolder.entityId,
					folderHierarchy.grandChildFolder.entityId
				]);

				stub(arDrive, 'getDriveIdAndAssertDrive').resolves(stubEntityIDAlt); // Returns different Drive ID

				await expectAsyncErrorThrow({
					promiseToError: arDrive.movePrivateFolder({
						folderId: folderHierarchy.childFolder.entityId,
						newParentFolderId: folderHierarchy.parentFolder.entityId,
						driveKey: await getStubDriveKey()
					}),
					errorMessage: 'Entity must stay in the same drive!'
				});
			});

			it('returns the correct ArFSResult', async () => {
				stub(arfsDao, 'getPrivateFolder').resolves(folderHierarchy.grandChildFolder);
				stub(arfsDao, 'getPrivateChildrenFolderIds').resolves([]);
				stub(arDrive, 'getDriveIdAndAssertDrive').resolves(stubEntityID);

				const result = await arDrive.movePrivateFolder({
					folderId: folderHierarchy.grandChildFolder.entityId,
					newParentFolderId: folderHierarchy.parentFolder.entityId,
					driveKey: await getStubDriveKey()
				});
				assertCreateFolderExpectations(result, 36, urlEncodeHashKey(await getStubDriveKey()));
			});
		});

		describe('file function', () => {
			describe('uploadPublicFile', () => {
				it('returns the correct ArFSResult', async () => {
					stub(arDrive, 'getDriveIdAndAssertDrive').resolves(stubEntityID);
					stub(arfsDao, 'getPublicFolder').resolves(stubPublicFolder());

					stub(communityOracle, 'getCommunityWinstonTip').resolves('1');
					stub(communityOracle, 'selectTokenHolder').resolves(stubArweaveAddress);

					const wrappedFile = wrapFileOrFolder('test_wallet.json');
					const result = await arDrive.uploadPublicFile(
						stubEntityID,
						new ArFSFileToUpload('test_wallet.json', wrappedFile.fileStats)
					);
					assertUploadFileExpectations(result, 3204, 166, 0, '1', 'public');
				});
			});

			describe('uploadPrivateFile', () => {
				it('returns the correct ArFSResult', async () => {
					stub(arDrive, 'getDriveIdAndAssertDrive').resolves(stubEntityID);
					stub(arfsDao, 'getPrivateFolder').resolves(stubPrivateFolder());

					stub(communityOracle, 'getCommunityWinstonTip').resolves('1');
					stub(communityOracle, 'selectTokenHolder').resolves(stubArweaveAddress);

					const wrappedFile = wrapFileOrFolder('test_wallet.json');
					const stubDriveKey = await getStubDriveKey();
					const result = await arDrive.uploadPrivateFile(
						stubEntityID,
						new ArFSFileToUpload('test_wallet.json', wrappedFile.fileStats),
						stubDriveKey
					);
					assertUploadFileExpectations(result, 3216, 182, 0, '1', 'private');
				});
			});

			describe('movePublicFile', () => {
				beforeEach(() => {
					stub(arfsDao, 'getPublicFile').resolves(stubPublicFile);
				});

				it('throws an error if the new parent folder id matches its current parent folder id', async () => {
					stub(arDrive, 'getDriveIdAndAssertDrive').resolves(stubEntityID);

					await expectAsyncErrorThrow({ promiseToError: arDrive.movePublicFile(stubEntityID, stubEntityID) });
				});

				it('throws an error if the file is being moved to a different drive', async () => {
					stub(arDrive, 'getDriveIdAndAssertDrive').resolves(stubEntityIDAlt); // Returns different drive ID

					await expectAsyncErrorThrow({
						promiseToError: arDrive.movePublicFile(stubEntityID, stubEntityID),
						errorMessage: 'Entity must stay in the same drive!'
					});
				});

				it('returns the correct ArFSResult', async () => {
					stub(arDrive, 'getDriveIdAndAssertDrive').resolves(stubEntityID);
					const result = await arDrive.movePublicFile(stubEntityID, stubEntityIDAlt);
					assertMoveFileExpectations(result, 153, 'public');
				});
			});

			describe('movePrivateFile', () => {
				beforeEach(() => {
					stub(arfsDao, 'getPrivateFile').resolves(stubPrivateFile);
				});

				it('throws an error if the new parent folder id matches its current parent folder id', async () => {
					stub(arDrive, 'getDriveIdAndAssertDrive').resolves(stubEntityID);

					await expectAsyncErrorThrow({
						promiseToError: arDrive.movePrivateFile(stubEntityID, stubEntityID, await getStubDriveKey())
					});
				});

				it('throws an error if the file is being moved to a different drive', async () => {
					stub(arDrive, 'getDriveIdAndAssertDrive').resolves(stubEntityIDAlt); // Returns different drive ID

					await expectAsyncErrorThrow({
						promiseToError: arDrive.movePrivateFile(stubEntityID, stubEntityID, await getStubDriveKey()),
						errorMessage: 'Entity must stay in the same drive!'
					});
				});

				it('returns the correct ArFSResult', async () => {
					stub(arDrive, 'getDriveIdAndAssertDrive').resolves(stubEntityID);

					const result = await arDrive.movePrivateFile(
						stubEntityID,
						stubEntityIDAlt,
						await getStubDriveKey()
					);
					assertMoveFileExpectations(result, 169, 'private');
				});
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
	// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
	expect(result.fees[fileEntity.dataTxId!]).to.equal(fileFee);

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
