import type { Wallet } from './wallet_new';
import Arweave from 'arweave';
import { v4 as uuidv4 } from 'uuid';

export class ArFSDAO {
	// TODO: Can we abstract Arweave type(s)?
	constructor(private readonly wallet: Wallet, arweave: Arweave) {
		// eslint-disable-next-line no-console
		console.log(this.wallet, arweave);
	}

	// TODO: RETURN ALL TRANSACTION DATA
	//createDrive(driveName: string): Promise<Transaction[]> {
	createDrive(driveName: string): Promise<void> {
		// Generate a new drive ID  for the new drive
		const driveId = uuidv4();

		// Generate a root folder ID for the new drive
		const rootFolderId = uuidv4();

		// Get the current time so the app can display the "created" data later on
		const unixTime = Math.round(Date.now() / 1000);

		// eslint-disable-next-line no-console
		console.log(rootFolderId, unixTime);

		// eslint-disable-next-line no-console
		console.log(driveName, driveId);
		return Promise.resolve();
	}
}
