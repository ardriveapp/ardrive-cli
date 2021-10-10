import {
	DriveAuthMode,
	driveDecrypt,
	DrivePrivacy,
	GQLNodeInterface,
	GQLTagInterface,
	Utf8ArrayToStr
} from 'ardrive-core-js';
import { ArFSPrivateDrive, ArFSPublicDrive } from '../../arfsdao';
import { CipherIV, DriveKey, FolderID } from '../../types';
import { ArFSMetadataEntityBuilder, ArFSPrivateMetadataEntityBuilderParams } from './arfs_builders';

export class ArFSPublicDriveBuilder extends ArFSMetadataEntityBuilder<ArFSPublicDrive> {
	drivePrivacy?: DrivePrivacy;
	rootFolderId?: FolderID;

	getGqlQueryParameters(): GQLTagInterface[] {
		return [
			{ name: 'Drive-Id', value: this.entityId },
			{ name: 'Entity-Type', value: 'drive' },
			{ name: 'Drive-Privacy', value: 'public' }
		];
	}

	protected async parseFromArweaveNode(node?: GQLNodeInterface): Promise<GQLTagInterface[]> {
		const unparsedTags: GQLTagInterface[] = [];
		const tags = await super.parseFromArweaveNode(node);
		tags.forEach((tag: GQLTagInterface) => {
			const key = tag.name;
			const { value } = tag;
			switch (key) {
				case 'Drive-Privacy':
					this.drivePrivacy = value as DrivePrivacy;
					break;
				default:
					unparsedTags.push(tag);
					break;
			}
		});
		return unparsedTags;
	}

	protected async buildEntity(): Promise<ArFSPublicDrive> {
		if (
			this.appName?.length &&
			this.appVersion?.length &&
			this.arFS?.length &&
			this.contentType?.length &&
			this.driveId?.length &&
			this.entityType?.length &&
			this.txId?.length &&
			this.unixTime &&
			this.driveId == this.entityId &&
			this.drivePrivacy?.length
		) {
			const txData = await this.arweave.transactions.getData(this.txId, { decode: true });
			const dataString = await Utf8ArrayToStr(txData);
			const dataJSON = await JSON.parse(dataString);

			// Get the drive name and root folder id
			this.name = dataJSON.name;
			this.rootFolderId = dataJSON.rootFolderId;
			if (!this.name || !this.rootFolderId) {
				throw new Error('Invalid drive state');
			}

			return new ArFSPublicDrive(
				this.appName,
				this.appVersion,
				this.arFS,
				this.contentType,
				this.driveId,
				this.entityType,
				this.name,
				this.txId,
				this.unixTime,
				this.drivePrivacy,
				this.rootFolderId
			);
		}
		throw new Error('Invalid drive state');
	}
}

export class ArFSPrivateDriveBuilder extends ArFSMetadataEntityBuilder<ArFSPrivateDrive> {
	drivePrivacy?: DrivePrivacy;
	rootFolderId?: FolderID;
	driveAuthMode?: DriveAuthMode;
	cipher?: string;
	cipherIV?: CipherIV;
	private readonly driveKey: DriveKey;

	constructor({ entityId: driveId, arweave, key: driveKey }: ArFSPrivateMetadataEntityBuilderParams) {
		super({ entityId: driveId, arweave });
		this.driveKey = driveKey;
	}

	getGqlQueryParameters(): GQLTagInterface[] {
		return [
			{ name: 'Drive-Id', value: this.entityId },
			{ name: 'Entity-Type', value: 'drive' },
			{ name: 'Drive-Privacy', value: 'private' }
		];
	}

	protected async parseFromArweaveNode(node?: GQLNodeInterface): Promise<GQLTagInterface[]> {
		const unparsedTags: GQLTagInterface[] = [];
		const tags = await super.parseFromArweaveNode(node);
		tags.forEach((tag: GQLTagInterface) => {
			const key = tag.name;
			const { value } = tag;
			switch (key) {
				case 'Cipher':
					this.cipher = value;
					break;
				case 'Cipher-IV':
					this.cipherIV = value;
					break;
				case 'Drive-Auth-Mode':
					this.driveAuthMode = value as DriveAuthMode;
					break;
				case 'Drive-Privacy':
					this.drivePrivacy = value as DrivePrivacy;
					break;
				default:
					unparsedTags.push(tag);
					break;
			}
		});
		return unparsedTags;
	}

	protected async buildEntity(): Promise<ArFSPrivateDrive> {
		if (
			this.appName?.length &&
			this.appVersion?.length &&
			this.arFS?.length &&
			this.contentType?.length &&
			this.driveId?.length &&
			this.entityType?.length &&
			this.txId?.length &&
			this.unixTime &&
			this.drivePrivacy?.length &&
			this.driveAuthMode?.length &&
			this.cipher?.length &&
			this.cipherIV?.length
		) {
			const txData = await this.arweave.transactions.getData(this.txId, { decode: true });
			const dataBuffer = Buffer.from(txData);
			const decryptedDriveBuffer: Buffer = await driveDecrypt(this.cipherIV, this.driveKey, dataBuffer);
			const decryptedDriveString: string = await Utf8ArrayToStr(decryptedDriveBuffer);
			const decryptedDriveJSON = await JSON.parse(decryptedDriveString);

			// Get the drive name and root folder id
			this.name = decryptedDriveJSON.name;
			this.rootFolderId = decryptedDriveJSON.rootFolderId;
			if (!this.name || !this.rootFolderId) {
				throw new Error('Invalid drive state');
			}

			return new ArFSPrivateDrive(
				this.appName,
				this.appVersion,
				this.arFS,
				this.contentType,
				this.driveId,
				this.entityType,
				this.name,
				this.txId,
				this.unixTime,
				this.drivePrivacy,
				this.rootFolderId,
				this.driveAuthMode,
				this.cipher,
				this.cipherIV
			);
		}

		throw new Error('Invalid drive state');
	}
}
