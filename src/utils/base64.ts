export function fromB64UrlToBuffer(input: string): Buffer {
	return Buffer.from(input, 'base64');
}

export function toB64Url(buffer: Buffer): string {
	return buffer.toString('base64');
}
