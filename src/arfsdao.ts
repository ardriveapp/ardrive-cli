import type { JWKWallet, Wallet } from './wallet_new';
import Arweave from 'arweave';
import { v4 as uuidv4 } from 'uuid';
import Transaction from 'arweave/node/lib/transaction';
import { CipherType, DriveAuthMode, DrivePrivacy, GQLTagInterface } from 'ardrive-core-js';

export const ArFS_O_11 = '0.11';

export type ArFSDriveMetaDataPrototype = {
	//appName: string; // NETWORK
	//appVersion: string; // NETWORK
	driveName: string;
	rootFolderId: string;
	cipher: CipherType | '';
	cipherIV: string;
	unixTime: number;
	arFS: string;
	driveId: string;
	driveSharing?: string; // DATABASE
	drivePrivacy: DrivePrivacy | '';
	driveAuthMode: DriveAuthMode | '';
	metaDataTxId: string; // PROBABLY OMIT
	metaDataSyncStatus: number; // OMIT
	isLocal?: number; // OMIT
};

export class ArFSDAO {
	// TODO: Can we abstract Arweave type(s)?
	constructor(private readonly wallet: Wallet, private readonly arweave: Arweave) {
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

	async prepareArFSDriveTransaction(
		driveJSON: string,
		driveMetaData: ArFSDriveMetaData,
		appName = 'ArDrive-Core',
		appVersion = '1.0',
		arFSVersion = ArFS_O_11,
		otherTags?: GQLTagInterface[]
	): Promise<Transaction> {
		const wallet = this.wallet as JWKWallet;

		// Create transaction
		const transaction = await this.arweave.createTransaction({ data: driveJSON }, wallet.getPrivateKey());

		// Tag file with ArFS Tags
		transaction.addTag('App-Name', appName);
		transaction.addTag('App-Version', appVersion);
		transaction.addTag('Unix-Time', driveMetaData.unixTime.toString());
		transaction.addTag('Drive-Id', driveMetaData.driveId);
		transaction.addTag('Drive-Privacy', driveMetaData.drivePrivacy);

		// TODO: DO WE WANT THIS?!?
		if (driveMetaData.drivePrivacy === 'private') {
			// If the file is private, we use extra tags
			// Tag file with Content-Type, Cipher and Cipher-IV and Drive-Auth-Mode
			transaction.addTag('Content-Type', 'application/octet-stream');
			transaction.addTag('Cipher', driveMetaData.cipher);
			transaction.addTag('Cipher-IV', driveMetaData.cipherIV);
			transaction.addTag('Drive-Auth-Mode', driveMetaData.driveAuthMode);
		} else {
			// Tag file with public tags only
			transaction.addTag('Content-Type', 'application/json');
		}

		transaction.addTag('ArFS', arFSVersion);
		transaction.addTag('Entity-Type', 'drive');

		// TODO: SANITIZE THESE?
		otherTags?.forEach((tag) => {
			transaction.addTag(tag.name, tag.value);
		});

		// Sign file
		await this.arweave.transactions.sign(transaction, wallet.getPrivateKey());
		return transaction;
	}
}
