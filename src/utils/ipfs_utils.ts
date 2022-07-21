// eslint-disable-next-line @typescript-eslint/no-var-requires
const CID = require('ipfs-only-hash');

type DataInput = string | Uint8Array | AsyncIterable<Uint8Array>;

export async function deriveIpfsCid(dataInput: DataInput): Promise<string> {
	const hash = await CID.of(dataInput);
	return hash;
}
