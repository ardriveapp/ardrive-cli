import { expect } from 'chai';
import sinon from 'sinon';
import * as fs from 'fs';
import { CLICommand, CommandDescriptor } from '../CLICommand/cli_command';
import { ParametersHelper } from '../CLICommand/parameters_helper';
import { ERROR_EXIT_CODE, SUCCESS_EXIT_CODE } from '../CLICommand/error_codes';
import {
	ADDR,
	ArDrive,
	ArFSDAO,
	DriveStateChain,
	GQLNodeInterface,
	JWKWallet,
	readDriveState,
	WalletDAO,
	Winston
} from 'ardrive-core-js';
import { ARDataPriceNetworkEstimator } from 'ardrive-core-js/lib/pricing/ar_data_price_network_estimator';
import { Turbo } from 'ardrive-core-js/lib/arfs/turbo';

// Importing the real command module registers 'create-snapshot' (with the actual commander program
// singleton) as a side effect -- mirrors how the CLI itself discovers commands via `./commands`.
import './create_snapshot';

const DRIVE_ID = 'bc9af866-6421-40f1-ac89-202bddb5c487';
const ROOT_FOLDER_ID = 'bc9af866-0000-40f1-ac89-202bddb5c487';
const FILE_ID = 'bc9af866-1111-40f1-ac89-202bddb5c487';

// A long-established, funds-free test fixture already used by this repo's other test suites to
// exercise REAL wallet signing offline: this command signs a real transaction or data item
// locally, which is what these tests assert against. Nothing is ever posted.
const testWallet = new JWKWallet(JSON.parse(fs.readFileSync('./test_wallet.json', { encoding: 'utf8' })));

function getCreateSnapshotDescriptor(): CommandDescriptor {
	const descriptor = CLICommand.getAllCommandDescriptors().find((cmd) => cmd.name === 'create-snapshot');
	if (!descriptor) {
		throw new Error(`'create-snapshot' command was not registered`);
	}
	return descriptor;
}

/**
 * Stubs the chain the producer reads with a small public drive: the drive, its
 * root folder and one file. With `withoutDrive`, the drive entity is missing.
 */
function stubDriveHistory(owner: string, { withoutDrive = false } = {}) {
	let n = 0;
	const node = (type: string, unixTime: number, tags: Record<string, string>, json: Record<string, unknown>) => ({
		node: ({
			id: `${n++}`.padStart(43, 'h'),
			owner: { address: owner },
			block: { height: 100 + n },
			tags: Object.entries({
				ArFS: '0.15',
				'Entity-Type': type,
				'Drive-Id': DRIVE_ID,
				'Unix-Time': `${unixTime}`,
				...tags
			}).map(([name, value]) => ({ name, value }))
		} as unknown) as GQLNodeInterface,
		json
	});
	const drive = node(
		'drive',
		1700000000,
		{ 'Drive-Privacy': 'public' },
		{ name: 'My Drive', rootFolderId: ROOT_FOLDER_ID }
	);
	const others = [
		node('folder', 1700000001, { 'Folder-Id': ROOT_FOLDER_ID }, { name: 'My Drive' }),
		node(
			'file',
			1700000002,
			{ 'File-Id': FILE_ID, 'Parent-Folder-Id': ROOT_FOLDER_ID },
			{ name: 'hello.txt', size: 5, dataTxId: 'd'.repeat(43), dataContentType: 'text/plain' }
		)
	];
	const byId = new Map([drive, ...others].map((h) => [h.node.id, h.json]));
	const chain: DriveStateChain = {
		currentHeight: async () => 2_000_000,
		driveNodes: async () => (withoutDrive ? [] : [drive.node]),
		folderAndFileNodes: async () => others.map((h) => h.node),
		metadata: async (nd) => byId.get(nd.id)!,
		minedTxIds: async (ids) => new Set(ids)
	};
	sinon
		.stub((ArFSDAO.prototype as unknown) as { driveStateChain: () => DriveStateChain }, 'driveStateChain')
		.returns(chain);
}

function printed(consoleLogStub: sinon.SinonStub): string {
	return consoleLogStub
		.getCalls()
		.map((call) => call.args[0])
		.join('\n');
}

function tagsOf(transaction: { tags: { get: (f: string, o: unknown) => string }[] }) {
	return transaction.tags.map((tag) => ({
		name: tag.get('name', { decode: true, string: true }),
		value: tag.get('value', { decode: true, string: true })
	}));
}

describe('create-snapshot command', () => {
	let owner: string;

	before(async () => {
		owner = `${await testWallet.getAddress()}`;
	});

	beforeEach(() => {
		sinon.stub(ParametersHelper.prototype, 'getRequiredWallet').resolves(testWallet);
		sinon.stub(ArDrive.prototype, 'getOwnerForDriveId').callsFake(async () => ADDR(owner));
	});

	afterEach(() => {
		sinon.restore();
	});

	it('is discoverable via the command registry with the expected params', () => {
		const parameterNames = getCreateSnapshotDescriptor().parameters.map((param) =>
			typeof param === 'string' ? param : param.name
		);

		expect(parameterNames).to.include.members([
			'driveId',
			'driveKey',
			'private',
			'unsafeDrivePassword',
			'boost',
			'dryRun',
			'walletFile',
			'seedPhrase',
			'gateway',
			'turbo',
			'turboUrl'
		]);
	});

	describe('the AR (layer 1) path', () => {
		beforeEach(() => {
			sinon.stub(WalletDAO.prototype, 'walletHasBalance').resolves(true);
			sinon
				.stub(ARDataPriceNetworkEstimator.prototype, 'getBaseWinstonPriceForByteCount')
				.resolves(new Winston('100'));
		});

		it('posts a drive state entity that a reader opens to the drive it was built from', async () => {
			stubDriveHistory(owner);
			const send = sinon.stub(ArFSDAO.prototype, 'sendTransactionsAsChunks').resolves();
			const consoleLogStub = sinon.stub(console, 'log');

			const exitCode = await getCreateSnapshotDescriptor().action.trigger({ driveId: DRIVE_ID });

			expect(exitCode).to.equal(SUCCESS_EXIT_CODE);
			expect(send.calledOnce).to.be.true;
			const [[transaction]] = send.firstCall.args;
			const tags = tagsOf(transaction as never);
			const tag = (name: string) => tags.find((t) => t.name === name)?.value;

			expect(tag('Entity-Type')).to.equal('drive-state');
			expect(tag('Drive-Id')).to.equal(DRIVE_ID);
			expect(tag('ArFS')).to.equal('0.15');
			expect(tag('App-Name')).to.equal('ArDrive-CLI');
			expect(tag('Content-Type')).to.equal('application/octet-stream');
			expect(tag('Block-End')).to.equal('2000000');
			expect(tag('Entity-Count')).to.equal('3');
			expect(tags.map((t) => t.name)).not.to.include('Content-Encoding');
			expect(tags.map((t) => t.name)).not.to.include('Cipher');

			const contents = await readDriveState(
				{
					txId: transaction.id,
					ownerAddress: owner,
					tags: Object.fromEntries(tags.map((t) => [t.name, t.value]))
				},
				Buffer.from(transaction.data),
				{ expectedOwnerAddress: owner, protection: { kind: 'public' } }
			);
			expect(contents.files.map((f) => f.name)).to.deep.equal(['hello.txt']);
			expect(contents.producer).to.match(/^ArDrive-CLI\//);

			expect(printed(consoleLogStub)).to.include('"transport": "arweave"');
			expect(printed(consoleLogStub)).to.include('"posted": true');
		});

		it('--dry-run signs locally, needs no balance, and posts nothing', async () => {
			stubDriveHistory(owner);
			const send = sinon.stub(ArFSDAO.prototype, 'sendTransactionsAsChunks').resolves();
			const consoleLogStub = sinon.stub(console, 'log');

			const exitCode = await getCreateSnapshotDescriptor().action.trigger({ driveId: DRIVE_ID, dryRun: true });

			expect(exitCode).to.equal(SUCCESS_EXIT_CODE);
			expect(send.called).to.be.false;
			expect((WalletDAO.prototype.walletHasBalance as sinon.SinonStub).called).to.be.false;
			expect(printed(consoleLogStub)).to.include('"posted": false');
			expect(printed(consoleLogStub)).to.match(/"txId": "[\w-]{43}"/);
		});

		it('refuses to post when the wallet balance cannot cover the estimated cost', async () => {
			stubDriveHistory(owner);
			(WalletDAO.prototype.walletHasBalance as sinon.SinonStub).resolves(false);
			const send = sinon.stub(ArFSDAO.prototype, 'sendTransactionsAsChunks').resolves();
			const consoleLogStub = sinon.stub(console, 'log');

			const exitCode = await getCreateSnapshotDescriptor().action.trigger({ driveId: DRIVE_ID });

			expect(exitCode).to.equal(ERROR_EXIT_CODE);
			expect(send.called).to.be.false;
			expect(consoleLogStub.calledWithMatch(sinon.match(/Insufficient wallet balance/))).to.be.true;
		});

		it('refuses a drive the wallet does not own, before reading its history', async () => {
			(ArDrive.prototype.getOwnerForDriveId as sinon.SinonStub).callsFake(async () => ADDR('s'.repeat(43)));
			const build = sinon.stub(ArFSDAO.prototype, 'buildPublicDriveState');
			const consoleLogStub = sinon.stub(console, 'log');

			const exitCode = await getCreateSnapshotDescriptor().action.trigger({ driveId: DRIVE_ID });

			expect(exitCode).to.equal(ERROR_EXIT_CODE);
			expect(build.called).to.be.false;
			expect(consoleLogStub.calledWithMatch(sinon.match(/only its owner can create a snapshot/))).to.be.true;
		});

		it('says why when the drive cannot be published as it stands', async () => {
			stubDriveHistory(owner, { withoutDrive: true });
			const send = sinon.stub(ArFSDAO.prototype, 'sendTransactionsAsChunks').resolves();
			const consoleLogStub = sinon.stub(console, 'log');

			const exitCode = await getCreateSnapshotDescriptor().action.trigger({ driveId: DRIVE_ID });

			expect(exitCode).to.equal(ERROR_EXIT_CODE);
			expect(send.called).to.be.false;
			expect(consoleLogStub.calledWithMatch(sinon.match(/Cannot create a snapshot of drive .* \(no-drive\)/))).to
				.be.true;
		});

		it('errors cleanly when --drive-id is not a valid entity ID', async () => {
			const consoleLogStub = sinon.stub(console, 'log');

			const exitCode = await getCreateSnapshotDescriptor().action.trigger({ driveId: 'not-a-drive-id' });

			expect(exitCode).to.equal(ERROR_EXIT_CODE);
			expect(consoleLogStub.calledWithMatch(sinon.match(/Invalid entity ID/))).to.be.true;
		});
	});

	describe('the --turbo path', () => {
		it('sends a drive state data item to Turbo', async () => {
			stubDriveHistory(owner);
			const sendDataItem = sinon.stub(Turbo.prototype, 'sendDataItem').resolves({
				id: 'turbo-response-id',
				owner: 'owner',
				dataCaches: [],
				fastFinalityIndexes: [],
				winc: '0'
			});
			const consoleLogStub = sinon.stub(console, 'log');

			const exitCode = await getCreateSnapshotDescriptor().action.trigger({ driveId: DRIVE_ID, turbo: true });

			expect(exitCode).to.equal(SUCCESS_EXIT_CODE);
			expect(sendDataItem.calledOnce).to.be.true;
			const [dataItem] = sendDataItem.firstCall.args;
			const tag = (name: string) => dataItem.tags.find((t: { name: string }) => t.name === name)?.value;
			expect(tag('Entity-Type')).to.equal('drive-state');
			expect(tag('State-Version')).to.equal('0.2');
			expect(printed(consoleLogStub)).to.include('"transport": "turbo"');
		});

		it('--dry-run sends nothing to Turbo', async () => {
			stubDriveHistory(owner);
			const sendDataItem = sinon.stub(Turbo.prototype, 'sendDataItem').resolves();
			const consoleLogStub = sinon.stub(console, 'log');

			const exitCode = await getCreateSnapshotDescriptor().action.trigger({
				driveId: DRIVE_ID,
				turbo: true,
				dryRun: true
			});

			expect(exitCode).to.equal(SUCCESS_EXIT_CODE);
			expect(sendDataItem.called).to.be.false;
			expect(printed(consoleLogStub)).to.include('"dryRun": true');
		});
	});
});
