// ipfs-unixfs-importer is ESM only; Node >= 22.12 can require() it from this CommonJS build
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { importer } = require('ipfs-unixfs-importer');

type CIDHashable = string | Uint8Array | AsyncIterable<Uint8Array>;

// Only the CID is needed, so every block is discarded instead of stored
const discardingBlockstore = { put: async (cid: unknown) => cid };

/**
 * Generates a v0 IPFS CID hash for the given data, matching `ipfs add` defaults
 * (256 KiB chunks, balanced DAG of 174 links per node, no raw leaves)
 * @param {CIDHashable} dataInput is the raw data of the file
 */
export async function deriveIpfsCid(dataInput: CIDHashable): Promise<string> {
	const content = typeof dataInput === 'string' ? new TextEncoder().encode(dataInput) : dataInput;

	let lastCid;
	for await (const { cid } of importer([{ content }], discardingBlockstore, {
		profile: 'unixfs-v0-2015',
		leafType: 'file',
		reduceSingleLeafToSelf: true
	})) {
		lastCid = cid;
	}

	return `${lastCid}`;
}
