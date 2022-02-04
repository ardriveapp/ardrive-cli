import { expect } from 'chai';
import { getArweaveFromURL } from './get_arweave_for_url';

describe('getArweaveFromURL method', () => {
	const validUrlTests: [URL, { protocol: string; host: string; port: string }][] = [
		[new URL('http://arweave.net'), { host: 'arweave.net', protocol: 'http', port: '80' }],
		[new URL('http://arweave.net:80'), { host: 'arweave.net', protocol: 'http', port: '80' }],
		[new URL('http://arweave.net:443'), { host: 'arweave.net', protocol: 'http', port: '443' }],
		[new URL('https://arweave.net'), { host: 'arweave.net', protocol: 'https', port: '443' }],
		[new URL('https://arweave.net:443'), { host: 'arweave.net', protocol: 'https', port: '443' }],
		[new URL('https://arweave.net:101'), { host: 'arweave.net', protocol: 'https', port: '101' }],
		[new URL('https://arweave.net:80'), { host: 'arweave.net', protocol: 'https', port: '80' }],
		[new URL('protocol://testIt.Com:92'), { host: 'testIt.Com', protocol: 'protocol', port: '92' }],
		[new URL('ftp://no-port-ftp-protocol.com'), { host: 'no-port-ftp-protocol.com', protocol: 'ftp', port: '80' }],
		[new URL('http://no-dot-com-is-fine'), { host: 'no-dot-com-is-fine', protocol: 'http', port: '80' }],
		[new URL('ar://gr8.emoji.🚀.com:1337'), { host: 'gr8.emoji.%F0%9F%9A%80.com', protocol: 'ar', port: '1337' }]
	];

	it('returns an Arweave instance from a URL object with the expected host, protocol, and port', () => {
		for (const [URL, { host: hostName, port, protocol }] of validUrlTests) {
			const arweaveInstance = getArweaveFromURL(URL);

			expect(arweaveInstance.api.config.host).to.equal(hostName);
			expect(`${arweaveInstance.api.config.port}`).to.equal(port);
			expect(arweaveInstance.api.config.protocol).to.equal(protocol);
		}
	});
});
