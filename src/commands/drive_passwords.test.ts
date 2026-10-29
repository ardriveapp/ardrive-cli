import { expect } from 'chai';
import sinon from 'sinon';
import * as fs from 'fs';
import prompts from 'prompts';
import {
	ArDrive,
	ArFSPrivateDriveMetaDataPrototype,
	ArFSPrivateDriveTransactionData,
	deriveDriveKey,
	driveEncrypt,
	DriveKey,
	DriveSignatureType,
	EID,
	GatewayAPI,
	GQLNodeInterface,
	JWKWallet,
	PrivateDriveKeyData,
	VersionedDriveKey
} from 'ardrive-core-js';
import { CLICommand, CommandDescriptor } from '../CLICommand/cli_command';
import { ERROR_EXIT_CODE, SUCCESS_EXIT_CODE } from '../CLICommand/error_codes';
import { cliArDriveFactory } from '..';

// Importing the real command modules registers them (with the actual commander program singleton)
// as a side effect, as the CLI itself does through `./commands`.
import './create_drive';
import './list_all_drives';
import './rename_drive';

// The module object itself: stubs on it reach the command's own `fs` import.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const nodeFs: typeof fs = require('fs');

// A funds-free fixture wallet already used by this repo's other suites. Nothing is posted: the
// gateway is stubbed, and the write paths below are stubbed before they would sign or send.
const WALLET_FILE = './test_wallet.json';
const testWallet = new JWKWallet(JSON.parse(fs.readFileSync(WALLET_FILE, { encoding: 'utf8' })));
const walletPrivateKey = JSON.stringify(testWallet.getPrivateKey());

const FIRST_PASSWORD = 'first-drive-password';
const SECOND_PASSWORD = 'second-drive-password';

interface FixtureDrive {
	driveId: string;
	rootFolderId: string;
	name: string;
	signatureType: DriveSignatureType;
	driveKey: VersionedDriveKey;
	node: GQLNodeInterface;
	data: Buffer;
}

/**
 * Two private drives owned by the test wallet, each with its own password: the oldest (v1, no
 * Signature-Type tag, as drives made before signature types were) opens with FIRST_PASSWORD, the
 * newer (v2, `Signature-Type: 2`) with SECOND_PASSWORD.
 */
async function makeFixtureDrives(owner: string): Promise<FixtureDrive[]> {
	const specs = [
		{
			driveId: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
			rootFolderId: 'aaaaaaaa-2222-4222-8222-aaaaaaaaaaaa',
			name: 'First Drive',
			password: FIRST_PASSWORD,
			signatureType: DriveSignatureType.v1
		},
		{
			driveId: 'bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb',
			rootFolderId: 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb',
			name: 'Second Drive',
			password: SECOND_PASSWORD,
			signatureType: DriveSignatureType.v2
		}
	];

	return Promise.all(
		specs.map(async (spec, index) => {
			const driveKey = (await deriveDriveKey({
				dataEncryptionKey: spec.password,
				driveId: spec.driveId,
				walletPrivateKey,
				driveSignatureType: spec.signatureType
			})) as VersionedDriveKey;
			const { cipher, cipherIV, data } = await driveEncrypt(
				driveKey,
				Buffer.from(JSON.stringify({ name: spec.name, rootFolderId: spec.rootFolderId }))
			);
			const tags: Record<string, string> = {
				'App-Name': 'ArDrive-Web',
				'App-Version': '2.0.0',
				ArFS: '0.15',
				'Content-Type': 'application/octet-stream',
				'Drive-Id': spec.driveId,
				'Entity-Type': 'drive',
				'Unix-Time': `${1700000000 + index}`,
				'Drive-Privacy': 'private',
				'Drive-Auth-Mode': 'password',
				Cipher: cipher,
				'Cipher-IV': cipherIV
			};
			if (spec.signatureType === DriveSignatureType.v2) {
				tags['Signature-Type'] = '2';
			}
			const node = ({
				id: `${index}`.padStart(43, 't'),
				owner: { address: owner },
				block: { height: 100 + index },
				tags: Object.entries(tags).map(([name, value]) => ({ name, value }))
			} as unknown) as GQLNodeInterface;

			return { ...spec, driveKey, node, data };
		})
	);
}

/** Serves the fixture drives from a stubbed gateway: GQL queries by tag, and their encrypted data. */
function stubGateway(drives: FixtureDrive[]): void {
	sinon.stub(GatewayAPI.prototype, 'gqlRequest').callsFake(async (query) => {
		const text = JSON.stringify(query);
		const matching = text.includes('drive-signature')
			? []
			: drives.filter((drive) => !text.includes('Drive-Id') || text.includes(drive.driveId));
		return {
			edges: matching.map((drive) => ({ cursor: drive.node.id, node: drive.node })),
			pageInfo: { hasNextPage: false }
		} as never;
	});
	sinon.stub(GatewayAPI.prototype, 'getTxData').callsFake(async (txId) => {
		const drive = drives.find((d) => d.node.id === `${txId}`);
		if (!drive) {
			throw new Error(`No fixture data for ${txId}`);
		}
		return drive.data;
	});
}

function getDescriptor(name: string): CommandDescriptor {
	const descriptor = CLICommand.getAllCommandDescriptors().find((cmd) => cmd.name === name);
	if (!descriptor) {
		throw new Error(`'${name}' command was not registered`);
	}
	return descriptor;
}

function printed(consoleLogStub: sinon.SinonStub): string {
	return consoleLogStub
		.getCalls()
		.map((call) => call.args[0])
		.join('\n');
}

describe('private drives with their own passwords', function () {
	// Drive keys are derived with real RSA signatures from the fixture wallet.
	this.timeout(30_000);

	let drives: FixtureDrive[];

	before(async () => {
		drives = await makeFixtureDrives(`${await testWallet.getAddress()}`);
	});

	beforeEach(() => {
		stubGateway(drives);
	});

	afterEach(() => {
		sinon.restore();
	});

	describe('create-drive', () => {
		it('fixture check: core-js rejects a password that does not open the first private drive', async () => {
			const ardrive = cliArDriveFactory({ wallet: testWallet });

			await ardrive.assertValidPassword(FIRST_PASSWORD);
			await ardrive.assertValidPassword(SECOND_PASSWORD).then(
				() => expect.fail('assertValidPassword accepted a password for a different drive'),
				(error: Error) => expect(error.message).to.match(/Invalid password/)
			);
		});

		it('creates a private drive with a password that differs from the existing drives', async () => {
			const fakeResult = { created: [], tips: [], fees: {} };
			const createPrivateDrive = sinon.stub(ArDrive.prototype, 'createPrivateDrive').resolves(fakeResult);
			const consoleLogStub = sinon.stub(console, 'log');

			const exitCode = await getDescriptor('create-drive').action.trigger({
				walletFile: WALLET_FILE,
				driveName: 'Third Drive',
				unsafeDrivePassword: SECOND_PASSWORD
			});

			expect(exitCode, printed(consoleLogStub)).to.equal(SUCCESS_EXIT_CODE);
			expect(createPrivateDrive.calledOnce).to.be.true;
			const { driveName, newPrivateDriveData } = createPrivateDrive.firstCall.args[0];
			expect(driveName).to.equal('Third Drive');

			// The new drive's key comes from the password given, as a v2 drive key.
			const { driveId, driveKey } = newPrivateDriveData as PrivateDriveKeyData;
			const expectedKey = await deriveDriveKey({
				dataEncryptionKey: SECOND_PASSWORD,
				driveId: `${driveId}`,
				walletPrivateKey,
				driveSignatureType: DriveSignatureType.v2
			});
			expect(`${driveKey}`).to.equal(`${expectedKey}`);
			expect((driveKey as VersionedDriveKey).driveSignatureType).to.equal(DriveSignatureType.v2);
		});

		describe('with the interactive -P prompt', () => {
			let savedEnvPassword: string | undefined;

			beforeEach(() => {
				// Nothing on STDIN and no ARDRIVE_DRIVE_PW, so -P falls through to the prompt.
				savedEnvPassword = process.env['ARDRIVE_DRIVE_PW'];
				delete process.env['ARDRIVE_DRIVE_PW'];
				const readFileSync = sinon.stub(nodeFs, 'readFileSync');
				readFileSync.callsFake(((path: unknown, ...rest: unknown[]) => {
					if (path === process.stdin.fd) {
						throw new Error('no STDIN in tests');
					}
					return (readFileSync.wrappedMethod as (...args: unknown[]) => unknown)(path, ...rest);
				}) as never);
			});

			afterEach(() => {
				if (savedEnvPassword !== undefined) {
					process.env['ARDRIVE_DRIVE_PW'] = savedEnvPassword;
				}
				// Drop any answers a failing test left queued.
				((prompts as unknown) as { _injected?: unknown[] })._injected = undefined;
			});

			it('asks for the new password twice and uses it when both entries match', async () => {
				const createPrivateDrive = sinon
					.stub(ArDrive.prototype, 'createPrivateDrive')
					.resolves({ created: [], tips: [], fees: {} });
				const consoleLogStub = sinon.stub(console, 'log');
				prompts.inject([SECOND_PASSWORD, SECOND_PASSWORD]);

				const exitCode = await getDescriptor('create-drive').action.trigger({
					walletFile: WALLET_FILE,
					driveName: 'Prompted Drive',
					private: true
				});

				expect(exitCode, printed(consoleLogStub)).to.equal(SUCCESS_EXIT_CODE);
				// Both answers were asked for: the confirmation prompt ran.
				expect(((prompts as unknown) as { _injected?: unknown[] })._injected).to.be.empty;
				const { newPrivateDriveData } = createPrivateDrive.firstCall.args[0];
				const { driveId, driveKey } = newPrivateDriveData as PrivateDriveKeyData;
				const expectedKey = await deriveDriveKey({
					dataEncryptionKey: SECOND_PASSWORD,
					driveId: `${driveId}`,
					walletPrivateKey,
					driveSignatureType: DriveSignatureType.v2
				});
				expect(`${driveKey}`).to.equal(`${expectedKey}`);
			});

			it('refuses to create the drive when the two entries differ', async () => {
				const createPrivateDrive = sinon.stub(ArDrive.prototype, 'createPrivateDrive');
				const consoleLogStub = sinon.stub(console, 'log');
				prompts.inject([SECOND_PASSWORD, FIRST_PASSWORD]);

				const exitCode = await getDescriptor('create-drive').action.trigger({
					walletFile: WALLET_FILE,
					driveName: 'Prompted Drive',
					private: true
				});

				expect(exitCode).to.equal(ERROR_EXIT_CODE);
				expect(printed(consoleLogStub)).to.include('Drive passwords do not match!');
				expect(createPrivateDrive.called).to.be.false;
			});
		});
	});

	describe('list-all-drives', () => {
		async function listDrives(options: Record<string, unknown>): Promise<Record<string, unknown>[]> {
			const consoleLogStub = sinon.stub(console, 'log');
			const exitCode = await getDescriptor('list-all-drives').action.trigger({
				walletFile: WALLET_FILE,
				...options
			});
			const output = printed(consoleLogStub);
			consoleLogStub.restore();
			expect(exitCode, output).to.equal(SUCCESS_EXIT_CODE);
			return JSON.parse(output);
		}

		function byId(listed: Record<string, unknown>[], driveId: string): Record<string, unknown> {
			const drive = listed.find((d) => d.driveId === driveId);
			expect(drive, `drive ${driveId} listed`).to.exist;
			return drive as Record<string, unknown>;
		}

		it('with one password, lists the drive it opens and the other as ENCRYPTED', async () => {
			const [first, second] = drives;

			const listedWithFirst = await listDrives({ unsafeDrivePassword: FIRST_PASSWORD });
			expect(listedWithFirst).to.have.length(2);
			expect(byId(listedWithFirst, first.driveId)).to.include({
				name: first.name,
				rootFolderId: first.rootFolderId
			});
			expect(byId(listedWithFirst, second.driveId)).to.include({
				name: 'ENCRYPTED',
				rootFolderId: 'ENCRYPTED'
			});

			const listedWithSecond = await listDrives({ unsafeDrivePassword: SECOND_PASSWORD });
			expect(byId(listedWithSecond, first.driveId)).to.include({ name: 'ENCRYPTED' });
			expect(byId(listedWithSecond, second.driveId)).to.include({
				name: second.name,
				rootFolderId: second.rootFolderId
			});
		});

		it('with the --drive-key of a v2 drive, opens it and reports its own signature type', async () => {
			const second = drives[1];

			const listed = await listDrives({ driveKey: `${second.driveKey}` });

			expect(byId(listed, second.driveId)).to.include({
				name: second.name,
				driveSignatureType: DriveSignatureType.v2
			});
			expect(byId(listed, drives[0].driveId)).to.include({ name: 'ENCRYPTED' });
		});
	});

	describe('rename-drive with --drive-key', () => {
		for (const index of [0, 1]) {
			it(`keeps the Signature-Type of a v${index + 1} drive`, async () => {
				const drive = drives[index];
				const renamePrivateDrive = sinon
					.stub(ArDrive.prototype, 'renamePrivateDrive')
					.resolves({ created: [], tips: [], fees: {} });
				const consoleLogStub = sinon.stub(console, 'log');

				const exitCode = await getDescriptor('rename-drive').action.trigger({
					walletFile: WALLET_FILE,
					driveId: drive.driveId,
					driveName: 'Renamed',
					driveKey: `${drive.driveKey}`
				});

				expect(exitCode, printed(consoleLogStub)).to.equal(SUCCESS_EXIT_CODE);
				const { driveKey } = renamePrivateDrive.firstCall.args[0] as { driveKey: DriveKey };
				expect((driveKey as VersionedDriveKey).driveSignatureType).to.equal(drive.signatureType);

				// The rename's metadata takes its Signature-Type tag from that key.
				const txData = await ArFSPrivateDriveTransactionData.from('Renamed', EID(drive.rootFolderId), driveKey);
				const prototype = new ArFSPrivateDriveMetaDataPrototype(EID(drive.driveId), txData);
				const signatureTag = prototype.gqlTags.find((tag) => tag.name === 'Signature-Type');
				expect(signatureTag?.value).to.equal(`${drive.signatureType}`);
			});
		}
	});
});
