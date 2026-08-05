import { expect } from 'chai';
import sinon from 'sinon';
import { CLICommand, CommandDescriptor } from '../CLICommand/cli_command';
import { ParametersHelper } from '../CLICommand/parameters_helper';
import { ERROR_EXIT_CODE, SUCCESS_EXIT_CODE } from '../CLICommand/error_codes';
import * as cliIndex from '..';
import { skipOnConflicts, Wallet } from 'ardrive-core-js';

// Importing the real command module registers 'pin-file' (with the actual commander program
// singleton) as a side effect -- mirrors how the CLI itself discovers commands via `./commands`.
import './pin_file';

const VALID_FOLDER_ID = 'a2c8a0cb-0ca7-4dbb-8bf8-93f75f308e63';
const VALID_DRIVE_ID = 'bc9af866-6421-40f1-ac89-202bddb5c487';
const VALID_TX_ID = 'a'.repeat(43);
const DEST_FILE_NAME = 'hello_world.txt';

const fakeWallet = ({ getAddress: async () => 'fake-address' } as unknown) as Wallet;

function getPinFileDescriptor(): CommandDescriptor {
	const descriptor = CLICommand.getAllCommandDescriptors().find((cmd) => cmd.name === 'pin-file');
	if (!descriptor) {
		throw new Error(`'pin-file' command was not registered`);
	}
	return descriptor;
}

describe('pin-file command', () => {
	afterEach(() => {
		sinon.restore();
	});

	it('is discoverable via the command registry', () => {
		const descriptor = getPinFileDescriptor();
		const parameterNames = descriptor.parameters.map((param) => (typeof param === 'string' ? param : param.name));

		expect(parameterNames).to.include.members([
			'parentFolderId',
			'txId',
			'destFileName',
			'driveId',
			'skip',
			'boost',
			'dryRun',
			'walletFile',
			'seedPhrase',
			'gateway',
			'turbo',
			'turboUrl'
		]);
	});

	it('calls ARDrive.pinPublicFile with the correct params and prints the result', async () => {
		const fakeResult = {
			created: [
				{
					type: 'file',
					metadataTxId: 'meta-tx-id-000000000000000000000000000',
					dataTxId: VALID_TX_ID,
					entityId: 'fake-file-id',
					entityName: DEST_FILE_NAME
				}
			],
			tips: [],
			fees: {}
		};
		const pinPublicFileStub = sinon.stub().resolves(fakeResult);
		sinon.stub(cliIndex, 'cliArDriveFactory').returns({ pinPublicFile: pinPublicFileStub } as never);
		sinon.stub(ParametersHelper.prototype, 'getRequiredWallet').resolves(fakeWallet);
		const consoleLogStub = sinon.stub(console, 'log');

		const descriptor = getPinFileDescriptor();
		const exitCode = await descriptor.action.trigger({
			parentFolderId: VALID_FOLDER_ID,
			txId: VALID_TX_ID,
			destFileName: DEST_FILE_NAME
		});

		expect(exitCode).to.equal(SUCCESS_EXIT_CODE);
		expect(pinPublicFileStub.calledOnce).to.be.true;

		const callArgs = pinPublicFileStub.firstCall.args[0];
		expect(String(callArgs.parentFolderId)).to.equal(VALID_FOLDER_ID);
		expect(String(callArgs.dataTxId)).to.equal(VALID_TX_ID);
		expect(callArgs.pinnedFileName).to.equal(DEST_FILE_NAME);
		expect(callArgs.driveId).to.be.undefined;
		expect(callArgs.conflictResolution).to.be.undefined;

		expect(consoleLogStub.calledWithMatch(sinon.match(/"entityName": "hello_world.txt"/))).to.be.true;
	});

	it('passes the optional --drive-id through as an assertion and maps --skip to skipOnConflicts', async () => {
		const pinPublicFileStub = sinon.stub().resolves({ created: [], tips: [], fees: {} });
		sinon.stub(cliIndex, 'cliArDriveFactory').returns({ pinPublicFile: pinPublicFileStub } as never);
		sinon.stub(ParametersHelper.prototype, 'getRequiredWallet').resolves(fakeWallet);
		sinon.stub(console, 'log');

		const descriptor = getPinFileDescriptor();
		const exitCode = await descriptor.action.trigger({
			parentFolderId: VALID_FOLDER_ID,
			txId: VALID_TX_ID,
			destFileName: DEST_FILE_NAME,
			driveId: VALID_DRIVE_ID,
			skip: true
		});

		expect(exitCode).to.equal(SUCCESS_EXIT_CODE);
		const callArgs = pinPublicFileStub.firstCall.args[0];
		expect(String(callArgs.driveId)).to.equal(VALID_DRIVE_ID);
		expect(callArgs.conflictResolution).to.equal(skipOnConflicts);
	});

	it('errors clearly, without calling pinPublicFile, when --tx-id is not a valid 43-character transaction id', async () => {
		const pinPublicFileStub = sinon.stub().resolves({ created: [], tips: [], fees: {} });
		sinon.stub(cliIndex, 'cliArDriveFactory').returns({ pinPublicFile: pinPublicFileStub } as never);
		sinon.stub(ParametersHelper.prototype, 'getRequiredWallet').resolves(fakeWallet);
		const consoleLogStub = sinon.stub(console, 'log');

		const descriptor = getPinFileDescriptor();
		const exitCode = await descriptor.action.trigger({
			parentFolderId: VALID_FOLDER_ID,
			txId: 'not-a-valid-tx-id',
			destFileName: DEST_FILE_NAME
		});

		expect(exitCode).to.equal(ERROR_EXIT_CODE);
		expect(pinPublicFileStub.called).to.be.false;
		expect(consoleLogStub.calledWithMatch(sinon.match(/43-character/))).to.be.true;
	});

	it('surfaces the core-js "public drives only" error clearly for a private-drive target, not a raw throw', async () => {
		const pinPublicFileStub = sinon.stub().rejects(new Error('Pinning is only supported for public drives'));
		sinon.stub(cliIndex, 'cliArDriveFactory').returns({ pinPublicFile: pinPublicFileStub } as never);
		sinon.stub(ParametersHelper.prototype, 'getRequiredWallet').resolves(fakeWallet);
		const consoleLogStub = sinon.stub(console, 'log');

		const descriptor = getPinFileDescriptor();
		const exitCode = await descriptor.action.trigger({
			parentFolderId: VALID_FOLDER_ID,
			txId: VALID_TX_ID,
			destFileName: DEST_FILE_NAME
		});

		expect(exitCode).to.equal(ERROR_EXIT_CODE);
		expect(consoleLogStub.calledWithMatch(sinon.match(/Pinning is only supported for public drives/))).to.be.true;
	});
});
