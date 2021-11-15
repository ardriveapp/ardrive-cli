import { JWKWallet, Wallet } from './wallet';
import * as fs from 'fs';
import fetch from 'node-fetch';
import { JWKInterface } from 'ardrive-core-js';
import { ArweaveAddress } from './types';

export function readJWKFile(path: string): Wallet {
	const walletFileData = fs.readFileSync(path, { encoding: 'utf8', flag: 'r' });
	const walletJSON = JSON.parse(walletFileData);
	const walletJWK = walletJSON as JWKInterface;
	const wallet = new JWKWallet(walletJWK);
	return wallet;
}

export async function fetchMempool(): Promise<string[]> {
	const response = await fetch('https://arweave.net/tx/pending');
	return response.json();
}

export function urlEncodeHashKey(keyBuffer: Buffer): string {
	return keyBuffer.toString('base64').replace('=', '');
}

export async function lastTxForAddress(address: ArweaveAddress): Promise<string> {
	const response = await fetch(`https://arweave.net/wallet/${address}/last_tx`);
	return response.text();
}

export async function getBaseFee(): Promise<string> {
	const response = await fetch(`https://arweave.net/price/0`);
	return response.text();
}
