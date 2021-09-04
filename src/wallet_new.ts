import { JWKInterface } from 'ardrive-core-js';
import * as B64js from 'base64-js';
import * as crypto from 'crypto';
import jwkToPem, { JWK } from 'jwk-to-pem';
import Arweave from 'arweave';

type PublicKey = string;
type ArweaveAddress = string;
type SeedPhrase = string;

export interface Wallet {
	getPublicKey(): Promise<PublicKey>;
	getAddress(): Promise<ArweaveAddress>;
	sign(data: Uint8Array): Promise<Uint8Array>;
}

export class JWKWallet implements Wallet {
	constructor(private readonly jwk: JWKInterface) {}

	getPublicKey(): Promise<PublicKey> {
		return Promise.resolve(this.jwk.n);
	}

	async getAddress(): Promise<ArweaveAddress> {
		const result = crypto
			.createHash('sha256')
			.update(b64UrlToBuffer(await this.getPublicKey()))
			.digest();
		return Promise.resolve(bufferTob64Url(result));
	}

	// Use cases: generating drive keys, file keys, etc.
	sign(data: Uint8Array): Promise<Uint8Array> {
		const sign = crypto.createSign('sha256');
		sign.update(data);
		const pem: string = jwkToPem(this.jwk as JWK, { private: true });
		const signature = sign.sign({
			key: pem,
			padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
			saltLength: 0 // We do not need to salt the signature since we combine with a random UUID
		});
		return Promise.resolve(signature);
	}
}

export class WalletDAO {
	constructor(private readonly arweave: Arweave) {}

	generateSeedPhrase(): Promise<SeedPhrase> {
		return Promise.resolve('TODO');
	}

	generateJWKWallet(seedPhrase: SeedPhrase): Promise<JWKWallet> {
		// TODO: Implement
		// eslint-disable-next-line no-console
		console.log(seedPhrase);
		return Promise.resolve(
			new JWKWallet({
				kty: '',
				e: '',
				n: '',
				d: '',
				p: '',
				q: '',
				dp: '',
				dq: '',
				qi: ''
			})
		);
	}

	getWalletBalance(wallet: Wallet): Promise<number> {
		// TODO: implement!
		// eslint-disable-next-line no-console
		console.log(this.arweave);
		return Promise.resolve(0);
	}

	/*public static async jwkToAddress(jwk: JWKInterface): Promise<string> {
		if (!jwk || jwk === "use_wallet") {
		  return this.getAddress();
		} else {
		  return this.getAddress(jwk);
		}
	  }*/
}

export function bufferTob64Url(buffer: Uint8Array): string {
	return b64UrlEncode(bufferTob64(buffer));
}

export function b64UrlEncode(b64UrlString: string): string {
	return b64UrlString.replace(/\+/g, '-').replace(/\//g, '_').replace(/\=/g, '');
}

export function bufferTob64(buffer: Uint8Array): string {
	return B64js.fromByteArray(new Uint8Array(buffer));
}

export function b64UrlToBuffer(b64UrlString: string): Uint8Array {
	return new Uint8Array(B64js.toByteArray(b64UrlDecode(b64UrlString)));
}

export function b64UrlDecode(b64UrlString: string): string {
	b64UrlString = b64UrlString.replace(/\-/g, '+').replace(/\_/g, '/');
	let padding;
	b64UrlString.length % 4 == 0 ? (padding = 0) : (padding = 4 - (b64UrlString.length % 4));
	return b64UrlString.concat('='.repeat(padding));
}
