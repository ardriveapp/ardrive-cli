import { JWKInterface } from 'arweave/node/lib/wallet';
import crypto, { createPrivateKey, createPublicKey, KeyLike, KeyObject } from 'crypto';
import { toB64Url } from './base64';

export async function signData(privateKey: KeyLike, dataToSign: string): Promise<Uint8Array> {
	const pem = ((privateKey as unknown) as crypto.KeyObject).export({
		format: 'pem',
		type: 'pkcs1'
	});
	const sign = crypto.createSign('sha256');
	sign.update(dataToSign);

	const signature = sign.sign({
		key: pem,
		padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
		saltLength: 0 // We do not need to salt the signature since we combine with a random UUID
	});
	return Promise.resolve(signature);
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
