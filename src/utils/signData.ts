import crypto from 'crypto';

export async function signData(privateKey: string, dataToSign: string): Promise<Uint8Array> {
	const sign = crypto.createSign('SHA256');
	sign.update(dataToSign);

	const signatureBuffer = sign.sign(privateKey);

	return new Uint8Array(signatureBuffer);
}
