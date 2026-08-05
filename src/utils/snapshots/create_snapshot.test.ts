import { expect } from 'chai';
import sinon from 'sinon';
import { ArweaveAddress, EID, GatewayAPI, GQLEdgeInterface, GQLNodeInterface, SnapshotTagName } from 'ardrive-core-js';
import { constructSnapshotData, SNAPSHOT_TX_FETCH_CONCURRENCY } from './create_snapshot';

const VALID_DRIVE_ID = 'bc9af866-6421-40f1-ac89-202bddb5c487';
const OWNER = new ArweaveAddress('a'.repeat(43));

// A minimal file-entity GQL node. `height === undefined` models an UNMINED (pending) revision:
// no block, so `constructSnapshotData` must exclude it from the body, the block bounds, and the count.
function fileNode(id: string, height: number | undefined): GQLNodeInterface {
	return {
		id,
		anchor: '',
		signature: '',
		recipient: '',
		owner: { address: 'fake-owner', key: '' },
		fee: { winston: '0', ar: '0' },
		quantity: { winston: '0', ar: '0' },
		data: { size: 0, type: 'application/json' },
		tags: [
			{ name: 'Entity-Type', value: 'file' },
			{ name: SnapshotTagName.driveId, value: VALID_DRIVE_ID }
		],
		block:
			height === undefined
				? ((undefined as unknown) as GQLNodeInterface['block'])
				: { id: `block-${height}`, timestamp: height, height, previous: '' },
		parent: { id: '' }
	};
}

function stubGql(edges: GQLEdgeInterface[]): void {
	sinon.stub(GatewayAPI.prototype, 'gqlRequest').resolves({ pageInfo: { hasNextPage: false }, edges });
}

function makeGatewayApi(): GatewayAPI {
	return new GatewayAPI({ gatewayUrl: new URL('https://example.invalid') });
}

describe('constructSnapshotData (unit): mined filter + bounded fetch', () => {
	afterEach(() => sinon.restore());

	it('excludes unmined (no block height) revisions from the body, block bounds, and entity count, and never fetches their data', async () => {
		const edges: GQLEdgeInterface[] = [
			{ cursor: '1', node: fileNode('a'.repeat(43), 200) },
			{ cursor: '2', node: fileNode('e'.repeat(43), undefined) } // unmined -- must be dropped
		];
		stubGql(edges);
		const getTxDataStub = sinon.stub(GatewayAPI.prototype, 'getTxData').resolves(Buffer.from('{}'));

		const { data, blockStart, blockEnd, entityCount } = await constructSnapshotData({
			owner: OWNER,
			driveId: EID(VALID_DRIVE_ID),
			gatewayApi: makeGatewayApi()
		});

		expect(entityCount).to.equal(1);
		expect(blockStart).to.equal(200);
		expect(blockEnd).to.equal(200);
		expect(data.txSnapshots).to.have.lengthOf(1);
		expect(data.txSnapshots[0].gqlNode.id).to.equal('a'.repeat(43));
		expect(getTxDataStub.calledOnce).to.be.true; // only the mined tx was fetched
	});

	it('throws a "have been mined yet" error when the drive has entities but none are mined', async () => {
		stubGql([{ cursor: '1', node: fileNode('a'.repeat(43), undefined) }]);
		sinon.stub(GatewayAPI.prototype, 'getTxData').resolves(Buffer.from('{}'));

		let error: Error | undefined;
		try {
			await constructSnapshotData({ owner: OWNER, driveId: EID(VALID_DRIVE_ID), gatewayApi: makeGatewayApi() });
		} catch (e) {
			error = e as Error;
		}
		expect(error?.message ?? '').to.match(/have been mined yet/);
	});

	it(`never exceeds SNAPSHOT_TX_FETCH_CONCURRENCY (${SNAPSHOT_TX_FETCH_CONCURRENCY}) concurrent getTxData requests, yet still runs them concurrently`, async () => {
		const count = SNAPSHOT_TX_FETCH_CONCURRENCY * 3;
		const edges: GQLEdgeInterface[] = Array.from({ length: count }, (_unused, i) => ({
			cursor: `c${i}`,
			node: fileNode(`${i}`.padStart(43, '0'), 100 + i)
		}));
		stubGql(edges);

		let inFlight = 0;
		let maxInFlight = 0;
		sinon.stub(GatewayAPI.prototype, 'getTxData').callsFake(async () => {
			inFlight += 1;
			maxInFlight = Math.max(maxInFlight, inFlight);
			await new Promise((resolve) => setTimeout(resolve, 5));
			inFlight -= 1;
			return Buffer.from('{}');
		});

		const { entityCount } = await constructSnapshotData({
			owner: OWNER,
			driveId: EID(VALID_DRIVE_ID),
			gatewayApi: makeGatewayApi()
		});

		expect(entityCount).to.equal(count);
		expect(maxInFlight).to.be.at.most(SNAPSHOT_TX_FETCH_CONCURRENCY); // the cap holds
		expect(maxInFlight).to.be.greaterThan(1); // ...but it is a real pool, not serial
	});

	it('preserves input order in the snapshot body even when fetches complete out of order', async () => {
		const edges: GQLEdgeInterface[] = [
			{ cursor: '1', node: fileNode('1'.repeat(43), 100) },
			{ cursor: '2', node: fileNode('2'.repeat(43), 101) },
			{ cursor: '3', node: fileNode('3'.repeat(43), 102) }
		];
		stubGql(edges);
		// Resolve the FIRST edge slowest so completion order != input order.
		sinon.stub(GatewayAPI.prototype, 'getTxData').callsFake(async (txId) => {
			const id = `${txId}`;
			await new Promise((resolve) => setTimeout(resolve, id.startsWith('1') ? 15 : 1));
			return Buffer.from(JSON.stringify({ id }));
		});

		const { data } = await constructSnapshotData({
			owner: OWNER,
			driveId: EID(VALID_DRIVE_ID),
			gatewayApi: makeGatewayApi()
		});

		expect(data.txSnapshots.map((t) => t.gqlNode.id)).to.deep.equal([
			'1'.repeat(43),
			'2'.repeat(43),
			'3'.repeat(43)
		]);
	});
});
