import type { JWKWallet, Wallet } from './wallet_new';
import Arweave from 'arweave';
import { v4 as uuidv4 } from 'uuid';
import Transaction from 'arweave/node/lib/transaction';
import { CipherType, DriveAuthMode, DrivePrivacy, GQLTagInterface } from 'ardrive-core-js';

export const ArFS_O_11 = '0.11';

export type CipherIV = string;

export abstract class ArFSDriveMetaDataPrototype {
	abstract driveName: string;
	abstract rootFolderId: string;
	abstract unixTime: number;
	abstract driveId: string;
	abstract privacy: DrivePrivacy;
	abstract cipher: CipherType;
	abstract cipherIV: CipherIV;
	abstract driveAuthMode: DriveAuthMode;

	addTagsToTransaction(transaction: Transaction): void {
		transaction.addTag('Entity-Type', 'drive');
		transaction.addTag('Unix-Time', this.unixTime.toString());
		transaction.addTag('Drive-Id', this.driveId);
		transaction.addTag('Drive-Privacy', this.privacy);
	}
}

export class ArFSPublicDriveMetaDataPrototype extends ArFSDriveMetaDataPrototype {
	readonly cipher: never;
	readonly cipherIV: never;
	readonly driveAuthMode: never;
	readonly privacy = 'public' as const;

	constructor(
		readonly driveName: string,
		readonly rootFolderId: string,
		readonly unixTime: number,
		readonly driveId: string
	) {
		super();
	}

	addTagsToTransaction(transaction: Transaction): void {
		super.addTagsToTransaction(transaction);
		transaction.addTag('Content-Type', 'application/json');
	}
}

export class ArFSPrivateDriveMetaDataPrototype extends ArFSDriveMetaDataPrototype {
	readonly driveAuthMode: DriveAuthMode = 'password';
	readonly privacy = 'private' as const;

	constructor(
		readonly driveName: string,
		readonly rootFolderId: string,
		readonly unixTime: number,
		readonly driveId: string,
		readonly cipher: CipherType,
		readonly cipherIV: CipherIV
	) {
		super();
	}

	addTagsToTransaction(transaction: Transaction): void {
		super.addTagsToTransaction(transaction);
		transaction.addTag('Content-Type', 'application/octet-stream');
		transaction.addTag('Cipher', this.cipher);
		transaction.addTag('Cipher-IV', this.cipherIV);
		transaction.addTag('Drive-Auth-Mode', this.driveAuthMode);
	}
}

// TODO: Extend rather than union type?
export type ArFSDriveMetaData =
	| ArFSDriveMetaDataPrototype
	| {
			appName: string;
			appVersion: string;
	  };

export class ArFSDAO {
	// TODO: Can we abstract Arweave type(s)?
	constructor(private readonly wallet: Wallet, private readonly arweave: Arweave) {
		// eslint-disable-next-line no-console
		console.log(this.wallet, arweave);
	}

	// TODO: RETURN ALL TRANSACTION DATA
	//createDrive(driveName: string): Promise<Transaction[]> {
	createPublicDrive(driveName: string): Promise<void> {
		// Generate a new drive ID  for the new drive
		const driveId = uuidv4();

		// Generate a root folder ID for the new drive
		const rootFolderId = uuidv4();

		// Get the current time so the app can display the "created" data later on
		const unixTime = Math.round(Date.now() / 1000);

		// TODO: CREATE A ROOT FOLDER METADATA TRANSACTION AND USE ROOT FOLDER ID IN FIXMEJSON BELOW!

		// Create a drive metadata transaction
		const driveMetaData = new ArFSPublicDriveMetaDataPrototype(driveName, 'FIXME', unixTime, driveId);
		const driveTrx = this.prepareArFSDriveTransaction('FIXMEJSON', driveMetaData);

		// eslint-disable-next-line no-console
		console.log(rootFolderId, unixTime);

		// eslint-disable-next-line no-console
		console.log(driveName, driveId);
		return Promise.resolve();
	}

	async prepareArFSDriveTransaction(
		driveJSON: string,
		driveMetaData: ArFSDriveMetaDataPrototype,
		appName = 'ArDrive-Core',
		appVersion = '1.0',
		arFSVersion = ArFS_O_11,
		otherTags?: GQLTagInterface[]
	): Promise<Transaction> {
		const wallet = this.wallet as JWKWallet;

		// Create transaction
		const transaction = await this.arweave.createTransaction({ data: driveJSON }, wallet.getPrivateKey());

		// Add baseline ArFS Tags
		transaction.addTag('App-Name', appName);
		transaction.addTag('App-Version', appVersion);
		transaction.addTag('ArFS', arFSVersion);

		// Add drive-specific tags
		driveMetaData.addTagsToTransaction(transaction);

		// TODO: SANITIZE THESE? i.e. make sure they're not overwriting?
		otherTags?.forEach((tag) => {
			transaction.addTag(tag.name, tag.value);
		});

		// Sign the transaction
		await this.arweave.transactions.sign(transaction, wallet.getPrivateKey());
		return transaction;
	}
}
