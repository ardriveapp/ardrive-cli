// eslint-disable-next-line @typescript-eslint/no-var-requires
const CID = require('ipfs-only-hash');

type CIDHashable = string | Uint8Array | AsyncIterable<Uint8Array>;

/**
 * Generates a v1 IPFS CID hash for the given data
 * @param {CIDHashable} dataInput is the raw data of the file
 */
export async function deriveIpfsCid(dataInput: CIDHashable): Promise<string> {
	const hash = await CID.of(dataInput);
	return hash;
}
