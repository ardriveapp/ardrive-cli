//import { v4 as uuidv4 } from 'uuid';
import { ArFSDAO, ArFSPublicDriveMetaDataPrototype } from './arfsdao';

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

	async createPublicDrive(driveName: string): Promise<CreateDriveResult> {
		// Generate a new drive ID
		const { driveTrx, rootFolderTrx, driveId, rootFolderId } = await this.arFsDao.createPublicDrive(driveName);

		/* CORE DOES THE FOLLOWING:
			• addDriveToDriveTable (NOT RELEVANT TO US RIGHT NOW)
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
			  metadataTxId: "${driveTrx.id}",
			  entityId: "${driveId}",
			  key: ""
			},
			{
			  type: "folder",
			  metadataTxId: "${rootFolderTrx.id}",
			  entityId: "${rootFolderId}",
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
			"${driveTrx.id}": ${driveTrx.reward},
			"${rootFolderTrx.id}": ${rootFolderTrx.reward},
			"qGr1BIVWQwdPMuQxJ9MmwMM8CBmZTIj9powGxJSZyi0": 344523
		  }
		`)
		);
	}
}
