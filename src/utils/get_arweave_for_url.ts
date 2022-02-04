import Arweave from 'arweave';

export function getArweaveFromURL(url: URL): Arweave {
	return Arweave.init({
		host: url.hostname,
		// Remove trailing `:` from protocol on URL type as required by Arweave constructor, e.g `http:` becomes `http`
		protocol: url.protocol.replace(':', ''),
		port: url.port,
		timeout: 600000
	});
}
