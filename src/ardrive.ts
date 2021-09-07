//import { v4 as uuidv4 } from 'uuid';
import type { ArFSDAO } from './arfsdao';

/*enum ArFSDrivePrivacy {
	Public = 'public',
	Private = 'private'
}*/

export type ArFSEntityDataType = 'drive' | 'folder';
export type ArFSTipType = 'drive' | 'folder';

export interface ArFSEntityData {
	type: ArFSEntityDataType;
	metadataTxId: string; // TODO: make a type that checks lengths
	key?: string;
}

// TODO: Is this really in the ArFS domain?
export interface ArFSTipData {
	type: ArFSTipType;
	txId: string; // TODO: make a type that checks lengths
	winston: number; // TODO: make a type that checks validity
}

export type ArFSFees = [string: number][];

export interface CreateDriveResult {
	created: ArFSEntityData[];
	tips: ArFSTipData[];
	fees: ArFSFees;
}

export class ArDrive {
	constructor(private readonly arFsDao: ArFSDAO) {}

	createPublicDrive(driveName: string): Promise<CreateDriveResult> {

		// Generate a new drive ID
		const driveTxs = this.arFsDao.createDrive(driveName);

		// eslint-disable-next-line no-console
		console.log(driveTxs);

		/* CORE DOES THE FOLLOWING:
			• addDriveToDriveTable
				- runs some SQL to add to the local DB (we'll omit this)
			• "sets up drive"
				- figures out what the root folder data should be and prepares that for syncing
			• Prepares an arweave-js transaction for upload of the drive metadata (uploadArFSDriveMetaData(user, newDrive: ArFSDriveMetaData))
				- prepare drive data JSON as the "body" of the transaction
				- add GQL tags
				- sign the whole transaction
			• Creates a chunked uploader
			• Executes a chunked upload
			• Prepares an arweave-js transaction for upload of the root folder metadata (uploadArFSFileMetaData(user, driveRootFolder: ArFSFileMetaData))
				- prepare folder data JSON as the "body" of the transaction
				- add GQL tags
				- sign the whole transaction
			• Creates a chunked uploader
			• Executes a chunked upload
		*/

		// Assemble metadata and transaction outcomes and produce output relevant to the CLI spec


		// GET TXID from DAO

		return Promise.resolve(
			JSON.parse(`
		created: [
			{
			  type: "drive",
			  metadataTxId: "slC4ypBTJyzBipxBbEesUCXNdr-xcOItC6W90NGD6xE",
			  entityId: "8752daa4-7958-40b5-8bd5-0b198a953f96",
			  key: ""
			},
			{
			  type: "folder",
			  metadataTxId: "6HGYgxS_me4HBGGZfMo6Hpl-ZBjtJ3HiGExQCpxbXnA",
			  entityId: "35ccc18b-81c0-491e-b6e3-c06045a4f8ce",
			  key: ""
			}
		  ],
		  tips: [
			{
			  type: "drive",
			  txId: "qGr1BIVWQwdPMuQxJ9MmwMM8CBmZTIj9powGxJSZyi0",
			  winston: 100000000
			}
		  ],
		  fees: {
			"slC4ypBTJyzBipxBbEesUCXNdr-xcOItC6W90NGD6xE": 498234,
			"6HGYgxS_me4HBGGZfMo6Hpl-ZBjtJ3HiGExQCpxbXnA": 234234,
			"qGr1BIVWQwdPMuQxJ9MmwMM8CBmZTIj9powGxJSZyi0": 344523
		  }
		`)
		);
	}
}
