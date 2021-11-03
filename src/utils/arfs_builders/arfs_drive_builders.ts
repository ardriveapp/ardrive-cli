import {
	DriveAuthMode,
	driveDecrypt,
	DrivePrivacy,
	GQLNodeInterface,
	GQLTagInterface,
	Utf8ArrayToStr
} from 'ardrive-core-js';
import Arweave from 'arweave';
import { ArFSDriveEntity, ArFSPrivateDrive, ArFSPublicDrive, ENCRYPTED_DATA_PLACEHOLDER } from '../../arfs_entities';
import { EntityMetaDataTransactionData, PrivateKeyData } from '../../private_key_data';
import { CipherIV, DriveKey, FolderID } from '../../types';
import { EID, EntityID } from '../../types/';
import { stubEntityID } from '../stubs';
import {
	ArFSMetadataEntityBuilder,
	ArFSMetadataEntityBuilderParams,
	ArFSPrivateMetadataEntityBuilderParams
} from './arfs_builders';

interface DriveMetaDataTransactionData extends EntityMetaDataTransactionData {
	name: string;
	rootFolderId: FolderID;
}

export class ArFSPublicDriveBuilder extends ArFSMetadataEntityBuilder<ArFSPublicDrive> {
	drivePrivacy?: DrivePrivacy;
	rootFolderId?: FolderID;

	static fromArweaveNode(node: GQLNodeInterface, arweave: Arweave): ArFSPublicDriveBuilder {
		const { tags } = node;
		const driveId = tags.find((tag) => tag.name === 'Drive-Id')?.value;
		if (!driveId) {
			throw new Error('Drive-ID tag missing!');
		}
		const driveBuilder = new ArFSPublicDriveBuilder({ entityId: EID(driveId), arweave });
		return driveBuilder;
	}

	getGqlQueryParameters(): GQLTagInterface[] {
		return [
			{ name: 'Drive-Id', value: `${this.entityId}` },
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
			this.driveId &&
			this.entityType?.length &&
			this.txId &&
			this.unixTime &&
			this.driveId.equals(this.entityId) &&
			this.drivePrivacy?.length
		) {
			const txData = await this.arweave.transactions.getData(`${this.txId}`, { decode: true });
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

	constructor({ entityId: driveId, arweave, key: driveKey, owner }: ArFSPrivateMetadataEntityBuilderParams) {
		super({ entityId: driveId, arweave, owner });
		this.driveKey = driveKey;
	}

	getGqlQueryParameters(): GQLTagInterface[] {
		return [
			{ name: 'Drive-Id', value: `${this.entityId}` },
			{ name: 'Entity-Type', value: 'drive' },
			{ name: 'Drive-Privacy', value: 'private' }
		];
	}

	static fromArweaveNode(node: GQLNodeInterface, arweave: Arweave, driveKey: DriveKey): ArFSPrivateDriveBuilder {
		const { tags } = node;
		const driveId = tags.find((tag) => tag.name === 'Drive-Id')?.value;
		if (!driveId) {
			throw new Error('Drive-ID tag missing!');
		}
		const fileBuilder = new ArFSPrivateDriveBuilder({ entityId: EID(driveId), arweave, key: driveKey });
		return fileBuilder;
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
			this.driveId &&
			this.entityType?.length &&
			this.txId &&
			this.unixTime &&
			this.drivePrivacy?.length &&
			this.driveAuthMode?.length &&
			this.cipher?.length &&
			this.cipherIV?.length
		) {
			const txData = await this.arweave.transactions.getData(`${this.txId}`, { decode: true });
			const dataBuffer = Buffer.from(txData);
			const decryptedDriveBuffer: Buffer = await driveDecrypt(this.cipherIV, this.driveKey, dataBuffer);
			const decryptedDriveString: string = await Utf8ArrayToStr(decryptedDriveBuffer);
			const decryptedDriveJSON: DriveMetaDataTransactionData = await JSON.parse(decryptedDriveString);

			this.name = decryptedDriveJSON.name;
			this.rootFolderId = decryptedDriveJSON.rootFolderId;

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

// A utility type to assist with fail-safe decryption of private entities
export class EncryptedEntityID extends EntityID {
	constructor() {
		super(`${stubEntityID}`); // Unused after next line
		this.entityId = ENCRYPTED_DATA_PLACEHOLDER;
	}
}

export interface SafeArFSPrivateMetadataEntityBuilderParams extends ArFSMetadataEntityBuilderParams {
	privateKeyData: PrivateKeyData;
}

export class SafeArFSDriveBuilder extends ArFSMetadataEntityBuilder<ArFSDriveEntity> {
	drivePrivacy?: DrivePrivacy;
	rootFolderId?: FolderID;
	driveAuthMode?: DriveAuthMode;
	cipher?: string;
	cipherIV?: CipherIV;

	private readonly privateKeyData: PrivateKeyData;

	constructor({ entityId: driveId, arweave, privateKeyData }: SafeArFSPrivateMetadataEntityBuilderParams) {
		super({ entityId: driveId, arweave });
		this.privateKeyData = privateKeyData;
	}

	getGqlQueryParameters(): GQLTagInterface[] {
		return [
			{ name: 'Drive-Id', value: `${this.entityId}` },
			{ name: 'Entity-Type', value: 'drive' }
		];
	}

	static fromArweaveNode(
		node: GQLNodeInterface,
		arweave: Arweave,
		privateKeyData: PrivateKeyData
	): SafeArFSDriveBuilder {
		const { tags } = node;
		const driveId = tags.find((tag) => tag.name === 'Drive-Id')?.value;
		if (!driveId) {
			throw new Error('Drive-ID tag missing!');
		}
		const driveBuilder = new SafeArFSDriveBuilder({
			entityId: EID(driveId),
			arweave,
			// TODO: Make all private builders optionally take driveKey and fail gracefully, populating fields with 'ENCRYPTED'
			privateKeyData
		});
		return driveBuilder;
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

	protected async buildEntity(): Promise<ArFSDriveEntity> {
		if (
			this.appName?.length &&
			this.appVersion?.length &&
			this.arFS?.length &&
			this.contentType?.length &&
			this.driveId &&
			this.entityType?.length &&
			this.txId &&
			this.unixTime &&
			this.drivePrivacy?.length
		) {
			const isPrivate = this.drivePrivacy === 'private';

			const txData = await this.arweave.transactions.getData(`${this.txId}`, { decode: true });
			const dataBuffer = Buffer.from(txData);

			// Data JSON will be false when a private drive cannot be decrypted
			const dataJSON: DriveMetaDataTransactionData = await (async () => {
				if (isPrivate) {
					// Type-check private properties
					if (this.cipher?.length && this.driveAuthMode?.length && this.cipherIV?.length) {
						const placeholderDriveData = {
							name: ENCRYPTED_DATA_PLACEHOLDER,
							rootFolderId: new EncryptedEntityID()
						};
						return this.privateKeyData.safelyDecryptToJson<DriveMetaDataTransactionData>(
							this.cipherIV,
							this.entityId,
							dataBuffer,
							placeholderDriveData
						);
					}
					throw new Error('Invalid private drive state');
				}
				// Drive is public, no decryption needed
				const dataString = await Utf8ArrayToStr(txData);
				return JSON.parse(dataString) as DriveMetaDataTransactionData;
			})();

			this.name = dataJSON.name;
			this.rootFolderId = dataJSON.rootFolderId;

			if (isPrivate) {
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
					// These private fields are type-checked these within the dataJSON closure
					// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
					this.driveAuthMode!,
					// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
					this.cipher!,
					// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
					this.cipherIV!
				);
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
