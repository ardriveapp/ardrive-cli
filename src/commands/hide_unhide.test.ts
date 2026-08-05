import { expect } from 'chai';
import sinon from 'sinon';
import { CLICommand, CommandDescriptor } from '../CLICommand/cli_command';
import { ParametersHelper } from '../CLICommand/parameters_helper';
import { SUCCESS_EXIT_CODE } from '../CLICommand/error_codes';
import * as cliIndex from '..';
import { DriveKey, Wallet } from 'ardrive-core-js';

// Importing the real command modules registers 'hide-file'/'unhide-file'/'hide-folder'/'unhide-folder'
// (with the actual commander program singleton) as a side effect -- mirrors how the CLI itself
// discovers commands via `./commands`.
import './hide_file';
import './unhide_file';
import './hide_folder';
import './unhide_folder';

const VALID_FILE_ID = '290a3f9a-37b2-4f0f-a899-6fac983833b3';
const VALID_FOLDER_ID = '568d5eba-dbf3-4a49-8129-1c58f7fd35bc';
const VALID_DRIVE_ID = 'bc9af866-6421-40f1-ac89-202bddb5c487';
const FAKE_DRIVE_KEY = ({} as unknown) as DriveKey;

const fakeWallet = ({ getAddress: async () => 'fake-address' } as unknown) as Wallet;

function getDescriptor(name: string): CommandDescriptor {
	const descriptor = CLICommand.getAllCommandDescriptors().find((cmd) => cmd.name === name);
	if (!descriptor) {
		throw new Error(`'${name}' command was not registered`);
	}
	return descriptor;
}

interface HideCommandSpec {
	commandName: string;
	idParamName: 'fileId' | 'folderId';
	validId: string;
	publicMethod: string;
	privateMethod: string;
	getDriveIdMethod: string;
}

const specs: HideCommandSpec[] = [
	{
		commandName: 'hide-file',
		idParamName: 'fileId',
		validId: VALID_FILE_ID,
		publicMethod: 'hidePublicFile',
		privateMethod: 'hidePrivateFile',
		getDriveIdMethod: 'getDriveIdForFileId'
	},
	{
		commandName: 'unhide-file',
		idParamName: 'fileId',
		validId: VALID_FILE_ID,
		publicMethod: 'unhidePublicFile',
		privateMethod: 'unhidePrivateFile',
		getDriveIdMethod: 'getDriveIdForFileId'
	},
	{
		commandName: 'hide-folder',
		idParamName: 'folderId',
		validId: VALID_FOLDER_ID,
		publicMethod: 'hidePublicFolder',
		privateMethod: 'hidePrivateFolder',
		getDriveIdMethod: 'getDriveIdForFolderId'
	},
	{
		commandName: 'unhide-folder',
		idParamName: 'folderId',
		validId: VALID_FOLDER_ID,
		publicMethod: 'unhidePublicFolder',
		privateMethod: 'unhidePrivateFolder',
		getDriveIdMethod: 'getDriveIdForFolderId'
	}
];

describe('hide-file / unhide-file / hide-folder / unhide-folder commands', () => {
	afterEach(() => {
		sinon.restore();
	});

	for (const spec of specs) {
		const { commandName, idParamName, validId, publicMethod, privateMethod, getDriveIdMethod } = spec;

		describe(`${commandName} command`, () => {
			it('is discoverable via the command registry with the expected params', () => {
				const descriptor = getDescriptor(commandName);
				const parameterNames = descriptor.parameters.map((param) =>
					typeof param === 'string' ? param : param.name
				);

				expect(parameterNames).to.include.members([
					idParamName,
					'boost',
					'dryRun',
					'turbo',
					'turboUrl',
					'driveKey',
					'walletFile',
					'seedPhrase',
					'private',
					'unsafeDrivePassword',
					'gateway'
				]);

				// hide/unhide never take a "new name" -- unlike rename-file/rename-folder
				expect(parameterNames).to.not.include.members(['fileName', 'folderName']);
			});

			it(`(public) calls ArDrive.${publicMethod} with just the ${idParamName} and prints the result, without touching drive-key resolution`, async () => {
				const fakeResult = { created: [{ type: 'file', entityId: validId }], tips: [], fees: {} };
				const publicMethodStub = sinon.stub().resolves(fakeResult);
				const getDriveIdStub = sinon.stub();
				const getDriveKeyStub = sinon.stub(ParametersHelper.prototype, 'getDriveKey');

				sinon.stub(cliIndex, 'cliArDriveFactory').returns({
					[publicMethod]: publicMethodStub,
					[getDriveIdMethod]: getDriveIdStub
				} as never);
				sinon.stub(ParametersHelper.prototype, 'getRequiredWallet').resolves(fakeWallet);
				const consoleLogStub = sinon.stub(console, 'log');

				const descriptor = getDescriptor(commandName);
				const exitCode = await descriptor.action.trigger({ [idParamName]: validId });

				expect(exitCode).to.equal(SUCCESS_EXIT_CODE);
				expect(publicMethodStub.calledOnce).to.be.true;

				const callArgs = publicMethodStub.firstCall.args[0];
				expect(String(callArgs[idParamName])).to.equal(validId);
				expect(Object.keys(callArgs)).to.deep.equal([idParamName]);

				// Public path never resolves a drive ID or drive key
				expect(getDriveIdStub.called).to.be.false;
				expect(getDriveKeyStub.called).to.be.false;

				expect(consoleLogStub.calledWithMatch(sinon.match(JSON.stringify(fakeResult, null, 4)))).to.be.true;
			});

			it(`(private, --drive-key) calls ArDrive.${privateMethod} with the ${idParamName} and resolved driveKey, after resolving the driveId via ${getDriveIdMethod}`, async () => {
				const fakeResult = { created: [{ type: 'file', entityId: validId }], tips: [], fees: {} };
				const privateMethodStub = sinon.stub().resolves(fakeResult);
				const getDriveIdStub = sinon.stub().resolves(VALID_DRIVE_ID);
				const publicMethodStub = sinon.stub();

				sinon.stub(cliIndex, 'cliArDriveFactory').returns({
					[privateMethod]: privateMethodStub,
					[publicMethod]: publicMethodStub,
					[getDriveIdMethod]: getDriveIdStub
				} as never);
				sinon.stub(ParametersHelper.prototype, 'getRequiredWallet').resolves(fakeWallet);
				const getDriveKeyStub = sinon.stub(ParametersHelper.prototype, 'getDriveKey').resolves(FAKE_DRIVE_KEY);
				const consoleLogStub = sinon.stub(console, 'log');

				const descriptor = getDescriptor(commandName);
				// A non-empty --drive-key is what flips ParametersHelper#getIsPrivate() to true; the
				// actual key material resolution is fully stubbed out via getDriveKey above, so no real
				// drive-key derivation or network call happens here.
				const exitCode = await descriptor.action.trigger({
					[idParamName]: validId,
					driveKey: 'ZmFrZS1kcml2ZS1rZXk='
				});

				expect(exitCode).to.equal(SUCCESS_EXIT_CODE);
				expect(publicMethodStub.called).to.be.false;
				expect(getDriveIdStub.calledOnceWith(sinon.match((id) => String(id) === validId))).to.be.true;
				expect(getDriveKeyStub.calledOnce).to.be.true;
				expect(getDriveKeyStub.firstCall.args[0]).to.deep.include({ driveId: VALID_DRIVE_ID });

				expect(privateMethodStub.calledOnce).to.be.true;
				const callArgs = privateMethodStub.firstCall.args[0];
				expect(String(callArgs[idParamName])).to.equal(validId);
				expect(callArgs.driveKey).to.equal(FAKE_DRIVE_KEY);
				expect(Object.keys(callArgs).sort()).to.deep.equal([idParamName, 'driveKey'].sort());

				expect(consoleLogStub.calledWithMatch(sinon.match(JSON.stringify(fakeResult, null, 4)))).to.be.true;
			});

			it('(private, --unsafe-drive-password) also routes to the private method', async () => {
				const fakeResult = { created: [], tips: [], fees: {} };
				const privateMethodStub = sinon.stub().resolves(fakeResult);
				const publicMethodStub = sinon.stub();
				const getDriveIdStub = sinon.stub().resolves(VALID_DRIVE_ID);

				sinon.stub(cliIndex, 'cliArDriveFactory').returns({
					[privateMethod]: privateMethodStub,
					[publicMethod]: publicMethodStub,
					[getDriveIdMethod]: getDriveIdStub
				} as never);
				sinon.stub(ParametersHelper.prototype, 'getRequiredWallet').resolves(fakeWallet);
				sinon.stub(ParametersHelper.prototype, 'getDriveKey').resolves(FAKE_DRIVE_KEY);
				sinon.stub(console, 'log');

				const descriptor = getDescriptor(commandName);
				const exitCode = await descriptor.action.trigger({
					[idParamName]: validId,
					unsafeDrivePassword: 'super-secret-password'
				});

				expect(exitCode).to.equal(SUCCESS_EXIT_CODE);
				expect(publicMethodStub.called).to.be.false;
				expect(privateMethodStub.calledOnce).to.be.true;
			});
		});
	}
});
