import { JWKInterface } from 'arweave/node/lib/wallet';
import crypto, { createPrivateKey, createPublicKey, KeyLike, KeyObject } from 'crypto';
import { toB64Url } from './base64';

export async function signData(privateKey: KeyLike, dataToSign: string): Promise<Uint8Array> {
	const sign = crypto.createSign('SHA256');
	sign.update(dataToSign);

	const signatureBuffer = sign.sign(privateKey);

	return new Uint8Array(signatureBuffer);
}

export function jwkInterfaceToPublicKey(jwk: JWKInterface): KeyObject {
	const publicKey = createPublicKey({
		key: {
			...jwk,
			kty: 'RSA'
		},
		format: 'jwk'
	});

	return publicKey;
}

export function jwkInterfaceToPrivateKey(jwk: JWKInterface): KeyObject {
	const privateKey = createPrivateKey({
		key: {
			...jwk,
			kty: 'RSA'
		},
		format: 'jwk'
	});

	return privateKey;
}

export function publicKeyToHeader(publicKey: KeyObject) {
	return toB64Url(Buffer.from(JSON.stringify(publicKey.export({ format: 'jwk' }))));
}
