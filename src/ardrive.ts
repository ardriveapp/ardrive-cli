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

		// IN THE FUTURE WE'LL SEND A COMMUNITY TIP HERE
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
		  tips: [],
		  fees: {
			"${driveTrx.id}": ${driveTrx.reward},
			"${rootFolderTrx.id}": ${rootFolderTrx.reward}
		  }
		`)
		);
	}
}
