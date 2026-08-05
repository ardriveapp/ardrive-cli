import { expect } from 'chai';
import sinon from 'sinon';
import * as fs from 'fs';
import { CLICommand, CommandDescriptor } from '../CLICommand/cli_command';
import { ParametersHelper } from '../CLICommand/parameters_helper';
import { ERROR_EXIT_CODE, SUCCESS_EXIT_CODE } from '../CLICommand/error_codes';
import {
	ArFSDAO,
	GatewayAPI,
	GQLEdgeInterface,
	GQLNodeInterface,
	JWKWallet,
	parseSnapshotData,
	SNAPSHOT_CONTENT_TYPE,
	SnapshotTagName,
	WalletDAO,
	Winston
} from 'ardrive-core-js';
import { ARDataPriceNetworkEstimator } from 'ardrive-core-js/lib/pricing/ar_data_price_network_estimator';
import { Turbo } from 'ardrive-core-js/lib/arfs/turbo';

// Importing the real command module registers 'create-snapshot' (with the actual commander program
// singleton) as a side effect -- mirrors how the CLI itself discovers commands via `./commands`.
import './create_snapshot';

const VALID_DRIVE_ID = 'bc9af866-6421-40f1-ac89-202bddb5c487';
const DRIVE_METADATA_TX_ID = 'a'.repeat(43);
const FILE_METADATA_TX_ID = 'b'.repeat(43);
const PRIOR_SNAPSHOT_TX_ID = 'c'.repeat(43);

// A long-established, funds-free test fixture already used by this repo's other test suites
// (see src/CLICommand/parameters_helper.test.ts) to exercise REAL wallet signing offline.
// Using a real JWKWallet here (rather than a `{ getAddress: async () => ... }` stub, as pin-file's
// tests use) is required because this command signs a real Arweave transaction / data item locally
// -- exactly what we want to assert against (tags, round-trippable body), never a network post.
const testWallet = new JWKWallet(JSON.parse(fs.readFileSync('./test_wallet.json', { encoding: 'utf8' })));

function makeNode(
	overrides: Partial<GQLNodeInterface> & Pick<GQLNodeInterface, 'id' | 'tags' | 'block'>
): GQLNodeInterface {
	return {
		anchor: '',
		signature: '',
		recipient: '',
		owner: { address: 'fake-owner-address', key: '' },
		fee: { winston: '0', ar: '0' },
		quantity: { winston: '0', ar: '0' },
		data: { size: 0, type: 'application/json' },
		parent: { id: '' },
		...overrides
	};
}

function getCreateSnapshotDescriptor(): CommandDescriptor {
	const descriptor = CLICommand.getAllCommandDescriptors().find((cmd) => cmd.name === 'create-snapshot');
	if (!descriptor) {
		throw new Error(`'create-snapshot' command was not registered`);
	}
	return descriptor;
}

/**
 * Stubs the GQL query + tx-data-fetch legs of `constructSnapshotData` with a fixed, deterministic
 * drive history: one drive-metadata tx, one file-metadata tx, and a PRIOR snapshot tx (which must
 * be excluded from the new snapshot's body). Never touches the network.
 */
function stubDriveHistory() {
	const driveMetadata = { name: 'My Drive', rootFolderId: VALID_DRIVE_ID };
	const fileMetadata = { name: 'hello.txt', size: 5, dataTxId: 'd'.repeat(43), dataContentType: 'text/plain' };

	const driveNode = makeNode({
		id: DRIVE_METADATA_TX_ID,
		tags: [
			{ name: 'Entity-Type', value: 'drive' },
			{ name: SnapshotTagName.driveId, value: VALID_DRIVE_ID },
			{ name: 'Content-Type', value: 'application/json' }
		],
		block: { id: 'block-a', timestamp: 1000, height: 100, previous: '' }
	});
	const fileNode = makeNode({
		id: FILE_METADATA_TX_ID,
		tags: [
			{ name: 'Entity-Type', value: 'file' },
			{ name: SnapshotTagName.driveId, value: VALID_DRIVE_ID },
			{ name: 'Content-Type', value: 'application/json' }
		],
		block: { id: 'block-b', timestamp: 2000, height: 150, previous: '' }
	});
	// A previous snapshot of the SAME drive -- carries the Drive-Id tag too (per REQUIRED_SNAPSHOT_TAG_NAMES),
	// so it would be picked up by a naive owner+Drive-Id query. It must never be indexed into a new snapshot.
	const priorSnapshotNode = makeNode({
		id: PRIOR_SNAPSHOT_TX_ID,
		tags: [
			{ name: SnapshotTagName.entityType, value: 'snapshot' },
			{ name: SnapshotTagName.driveId, value: VALID_DRIVE_ID },
			{ name: SnapshotTagName.blockStart, value: '1' },
			{ name: SnapshotTagName.blockEnd, value: '99' },
			{ name: SnapshotTagName.contentType, value: SNAPSHOT_CONTENT_TYPE }
		],
		block: { id: 'block-0', timestamp: 500, height: 99, previous: '' }
	});

	const edges: GQLEdgeInterface[] = [
		{ cursor: 'cursor-1', node: fileNode },
		{ cursor: 'cursor-2', node: driveNode },
		{ cursor: 'cursor-3', node: priorSnapshotNode }
	];

	const gqlRequestStub = sinon
		.stub(GatewayAPI.prototype, 'gqlRequest')
		.resolves({ pageInfo: { hasNextPage: false }, edges });

	const metadataByTxId: Record<string, Buffer> = {
		[DRIVE_METADATA_TX_ID]: Buffer.from(JSON.stringify(driveMetadata)),
		[FILE_METADATA_TX_ID]: Buffer.from(JSON.stringify(fileMetadata))
	};
	const getTxDataStub = sinon.stub(GatewayAPI.prototype, 'getTxData').callsFake(async (txId) => {
		const data = metadataByTxId[`${txId}`];
		if (!data) {
			throw new Error(`Test setup error: unexpected getTxData call for ${txId}`);
		}
		return data;
	});

	return { gqlRequestStub, getTxDataStub, driveMetadata, fileMetadata };
}

describe('create-snapshot command', () => {
	afterEach(() => {
		sinon.restore();
	});

	it('is discoverable via the command registry with the expected params', () => {
		const descriptor = getCreateSnapshotDescriptor();
		const parameterNames = descriptor.parameters.map((param) => (typeof param === 'string' ? param : param.name));

		expect(parameterNames).to.include.members([
			'driveId',
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
			sinon.stub(ParametersHelper.prototype, 'getRequiredWallet').resolves(testWallet);
			sinon.stub(WalletDAO.prototype, 'walletHasBalance').resolves(true);
			sinon
				.stub(ARDataPriceNetworkEstimator.prototype, 'getBaseWinstonPriceForByteCount')
				.resolves(new Winston('100'));
		});

		it('builds a snapshot body that round-trips through parseSnapshotData, tags the tx with the core-js snapshot constants, excludes prior snapshots, and posts it', async () => {
			const { driveMetadata, fileMetadata } = stubDriveHistory();
			const sendTransactionsAsChunksStub = sinon.stub(ArFSDAO.prototype, 'sendTransactionsAsChunks').resolves();
			const consoleLogStub = sinon.stub(console, 'log');

			const descriptor = getCreateSnapshotDescriptor();
			const exitCode = await descriptor.action.trigger({ driveId: VALID_DRIVE_ID });

			expect(exitCode).to.equal(SUCCESS_EXIT_CODE);
			expect(sendTransactionsAsChunksStub.calledOnce).to.be.true;

			const [postedTransactions] = sendTransactionsAsChunksStub.firstCall.args;
			expect(postedTransactions).to.have.lengthOf(1);
			const transaction = postedTransactions[0];

			// Tag correctness: exactly the ArFS snapshot tag set (core-js's own constants), decoded back
			// from the real, locally-signed Arweave transaction.
			const decodedTags = transaction.tags.map((tag: { get: (f: string, o: unknown) => string }) => ({
				name: tag.get('name', { decode: true, string: true }),
				value: tag.get('value', { decode: true, string: true })
			}));
			const tagValue = (name: string) => decodedTags.find((t: { name: string }) => t.name === name)?.value;

			expect(tagValue(SnapshotTagName.entityType)).to.equal('snapshot');
			expect(tagValue(SnapshotTagName.driveId)).to.equal(VALID_DRIVE_ID);
			expect(tagValue(SnapshotTagName.blockStart)).to.equal('100');
			expect(tagValue(SnapshotTagName.blockEnd)).to.equal('150');
			expect(tagValue(SnapshotTagName.contentType)).to.equal(SNAPSHOT_CONTENT_TYPE);

			// Round-trip: the exact body this command posted must be readable by core-js's OWN parser.
			const parsed = parseSnapshotData(Buffer.from(transaction.data));
			expect(parsed.txSnapshots).to.have.lengthOf(2); // excludes the prior snapshot tx

			const byId = (id: string) => parsed.txSnapshots.find((tx) => tx.gqlNode.id === id);
			expect(byId(DRIVE_METADATA_TX_ID)?.jsonMetadata).to.equal(JSON.stringify(driveMetadata));
			expect(byId(FILE_METADATA_TX_ID)?.jsonMetadata).to.equal(JSON.stringify(fileMetadata));
			expect(byId(PRIOR_SNAPSHOT_TX_ID)).to.be.undefined;

			// Printed result surfaces the same facts
			const printedJson = consoleLogStub
				.getCalls()
				.map((call) => call.args[0])
				.join('\n');
			expect(printedJson).to.include('"entityCount": 2');
			expect(printedJson).to.include('"posted": true');
			expect(printedJson).to.include('"dryRun": false');
		});

		it('--dry-run signs the transaction locally but does NOT post it', async () => {
			stubDriveHistory();
			const sendTransactionsAsChunksStub = sinon.stub(ArFSDAO.prototype, 'sendTransactionsAsChunks').resolves();
			const consoleLogStub = sinon.stub(console, 'log');

			const descriptor = getCreateSnapshotDescriptor();
			const exitCode = await descriptor.action.trigger({ driveId: VALID_DRIVE_ID, dryRun: true });

			expect(exitCode).to.equal(SUCCESS_EXIT_CODE);
			expect(sendTransactionsAsChunksStub.called).to.be.false;

			const printedJson = consoleLogStub
				.getCalls()
				.map((call) => call.args[0])
				.join('\n');
			expect(printedJson).to.include('"posted": false');
			expect(printedJson).to.include('"dryRun": true');
			expect(printedJson).to.match(/"snapshotId": "[\w-]{43}"/); // still resolves a real (unposted) tx id
		});

		it('refuses to post when the wallet balance cannot cover the estimated cost, without ever posting', async () => {
			stubDriveHistory();
			(WalletDAO.prototype.walletHasBalance as sinon.SinonStub).resolves(false);
			const sendTransactionsAsChunksStub = sinon.stub(ArFSDAO.prototype, 'sendTransactionsAsChunks').resolves();
			const consoleLogStub = sinon.stub(console, 'log');

			const descriptor = getCreateSnapshotDescriptor();
			const exitCode = await descriptor.action.trigger({ driveId: VALID_DRIVE_ID });

			expect(exitCode).to.equal(ERROR_EXIT_CODE);
			expect(sendTransactionsAsChunksStub.called).to.be.false;
			expect(consoleLogStub.calledWithMatch(sinon.match(/Insufficient wallet balance/))).to.be.true;
		});

		it('errors cleanly, without querying or posting, when --drive-id is not a valid entity ID', async () => {
			const gqlRequestStub = sinon.stub(GatewayAPI.prototype, 'gqlRequest');
			const sendTransactionsAsChunksStub = sinon.stub(ArFSDAO.prototype, 'sendTransactionsAsChunks').resolves();
			const consoleLogStub = sinon.stub(console, 'log');

			const descriptor = getCreateSnapshotDescriptor();
			const exitCode = await descriptor.action.trigger({ driveId: 'not-a-drive-id' });

			expect(exitCode).to.equal(ERROR_EXIT_CODE);
			expect(gqlRequestStub.called).to.be.false;
			expect(sendTransactionsAsChunksStub.called).to.be.false;
			expect(consoleLogStub.calledWithMatch(sinon.match(/Invalid entity ID/))).to.be.true;
		});

		it('errors cleanly when the drive has no entity history to snapshot', async () => {
			sinon.stub(GatewayAPI.prototype, 'gqlRequest').resolves({ pageInfo: { hasNextPage: false }, edges: [] });
			const sendTransactionsAsChunksStub = sinon.stub(ArFSDAO.prototype, 'sendTransactionsAsChunks').resolves();
			const consoleLogStub = sinon.stub(console, 'log');

			const descriptor = getCreateSnapshotDescriptor();
			const exitCode = await descriptor.action.trigger({ driveId: VALID_DRIVE_ID });

			expect(exitCode).to.equal(ERROR_EXIT_CODE);
			expect(sendTransactionsAsChunksStub.called).to.be.false;
			expect(consoleLogStub.calledWithMatch(sinon.match(/nothing to snapshot yet/))).to.be.true;
		});
	});

	describe('the --turbo path', () => {
		beforeEach(() => {
			sinon.stub(ParametersHelper.prototype, 'getRequiredWallet').resolves(testWallet);
		});

		it('prepares a data item tagged with the core-js snapshot constants and posts it via Turbo', async () => {
			stubDriveHistory();
			const sendDataItemStub = sinon.stub(Turbo.prototype, 'sendDataItem').resolves({
				id: 'turbo-response-id',
				owner: 'owner',
				dataCaches: [],
				fastFinalityIndexes: [],
				winc: '0'
			});
			const consoleLogStub = sinon.stub(console, 'log');

			const descriptor = getCreateSnapshotDescriptor();
			const exitCode = await descriptor.action.trigger({ driveId: VALID_DRIVE_ID, turbo: true });

			expect(exitCode).to.equal(SUCCESS_EXIT_CODE);
			expect(sendDataItemStub.calledOnce).to.be.true;

			const [postedDataItem] = sendDataItemStub.firstCall.args;
			const tagValue = (name: string) =>
				postedDataItem.tags.find((t: { name: string }) => t.name === name)?.value;

			expect(tagValue(SnapshotTagName.entityType)).to.equal('snapshot');
			expect(tagValue(SnapshotTagName.driveId)).to.equal(VALID_DRIVE_ID);
			expect(tagValue(SnapshotTagName.blockStart)).to.equal('100');
			expect(tagValue(SnapshotTagName.blockEnd)).to.equal('150');

			const printedJson = consoleLogStub
				.getCalls()
				.map((call) => call.args[0])
				.join('\n');
			expect(printedJson).to.include('"posted": true');
		});

		it('--dry-run does NOT post the data item to Turbo', async () => {
			stubDriveHistory();
			const sendDataItemStub = sinon.stub(Turbo.prototype, 'sendDataItem').resolves();
			const consoleLogStub = sinon.stub(console, 'log');

			const descriptor = getCreateSnapshotDescriptor();
			const exitCode = await descriptor.action.trigger({ driveId: VALID_DRIVE_ID, turbo: true, dryRun: true });

			expect(exitCode).to.equal(SUCCESS_EXIT_CODE);
			expect(sendDataItemStub.called).to.be.false;

			const printedJson = consoleLogStub
				.getCalls()
				.map((call) => call.args[0])
				.join('\n');
			expect(printedJson).to.include('"posted": false');
			expect(printedJson).to.include('"dryRun": true');
		});
	});
});
