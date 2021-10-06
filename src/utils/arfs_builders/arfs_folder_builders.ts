import { fileDecrypt, GQLNodeInterface, GQLTagInterface, Utf8ArrayToStr } from 'ardrive-core-js';
import Arweave from 'arweave';
import { ArFSPrivateFolder, ArFSPublicFolder } from '../../arfsdao';
import { CipherIV, DriveKey, FolderID } from '../../types';
import { ArFSFileOrFolderBuilder } from './arfs_builders';

export abstract class ArFSFolderBuilder<
	T extends ArFSPublicFolder | ArFSPrivateFolder
> extends ArFSFileOrFolderBuilder<T> {
	getGqlQueryParameters(): GQLTagInterface[] {
		return [
			{ name: 'Folder-Id', value: this.entityId },
			{ name: 'Entity-Type', value: 'folder' }
		];
	}
}

export class ArFSPublicFolderBuilder extends ArFSFolderBuilder<ArFSPublicFolder> {
	static fromArweaveNode(node: GQLNodeInterface, arweave: Arweave): ArFSPublicFolderBuilder {
		const { tags } = node;
		const folderId = tags.find((tag) => tag.name === 'Folder-Id')?.value;
		if (!folderId) {
			throw new Error('Folder-ID tag missing!');
		}
		const folderBuilder = new ArFSPublicFolderBuilder(folderId, arweave);
		return folderBuilder;
	}

	protected async buildEntity(): Promise<ArFSPublicFolder> {
		if (!this.parentFolderId) {
			// Root folders do not have a Parent-Folder-Id tag
			this.parentFolderId = 'root folder';
		}

		if (
			this.appName?.length &&
			this.appVersion?.length &&
			this.arFS?.length &&
			this.contentType?.length &&
			this.driveId?.length &&
			this.entityType?.length &&
			this.txId?.length &&
			this.unixTime &&
			this.parentFolderId?.length &&
			this.entityId?.length
		) {
			const txData = await this.arweave.transactions.getData(this.txId, { decode: true });
			const dataString = await Utf8ArrayToStr(txData);
			const dataJSON = await JSON.parse(dataString);

			// Get the folder name
			this.name = dataJSON.name;
			if (!this.name) {
				throw new Error('Invalid folder state');
			}

			return Promise.resolve(
				new ArFSPublicFolder(
					this.appName,
					this.appVersion,
					this.arFS,
					this.contentType,
					this.driveId,
					this.entityType,
					this.name,
					this.txId,
					this.unixTime,
					this.parentFolderId,
					this.entityId
				)
			);
		}
		throw new Error('Invalid folder state');
	}
}

export class ArFSPrivateFolderBuilder extends ArFSFolderBuilder<ArFSPrivateFolder> {
	cipher?: string;
	cipherIV?: CipherIV;

	constructor(readonly folderId: FolderID, readonly arweave: Arweave, protected readonly driveKey: DriveKey) {
		super(folderId, arweave);
	}

	static fromArweaveNode(node: GQLNodeInterface, arweave: Arweave, driveKey: DriveKey): ArFSPrivateFolderBuilder {
		const { tags } = node;
		const folderId = tags.find((tag) => tag.name === 'Folder-Id')?.value;
		if (!folderId) {
			throw new Error('Folder-ID tag missing!');
		}
		const folderBuilder = new ArFSPrivateFolderBuilder(folderId, arweave, driveKey);
		return folderBuilder;
	}

	protected async parseFromArweaveNode(node?: GQLNodeInterface): Promise<GQLTagInterface[]> {
		const unparsedTags: GQLTagInterface[] = [];
		const tags = await super.parseFromArweaveNode(node);
		tags.forEach((tag: GQLTagInterface) => {
			const key = tag.name;
			const { value } = tag;
			switch (key) {
				case 'Cipher-IV':
					this.cipherIV = value;
					break;
				case 'Cipher':
					this.cipher = value;
					break;
				default:
					unparsedTags.push(tag);
					break;
			}
		});
		return unparsedTags;
	}

	protected async buildEntity(): Promise<ArFSPrivateFolder> {
		if (!this.parentFolderId) {
			// Root folders do not have a Parent-Folder-Id tag
			this.parentFolderId = 'root folder';
		}

		if (
			this.appName?.length &&
			this.appVersion?.length &&
			this.arFS?.length &&
			this.contentType?.length &&
			this.driveId?.length &&
			this.entityType?.length &&
			this.txId?.length &&
			this.unixTime &&
			this.parentFolderId?.length &&
			this.entityId?.length &&
			this.cipher?.length &&
			this.cipherIV?.length
		) {
			const txData = await this.arweave.transactions.getData(this.txId, { decode: true });
			const dataBuffer = Buffer.from(txData);

			const decryptedFolderBuffer: Buffer = await fileDecrypt(this.cipherIV, this.driveKey, dataBuffer);
			const decryptedFolderString: string = await Utf8ArrayToStr(decryptedFolderBuffer);
			const decryptedFolderJSON = await JSON.parse(decryptedFolderString);

			// Get the folder name
			this.name = decryptedFolderJSON.name;
			if (!this.name) {
				throw new Error('Invalid folder state');
			}

			return new ArFSPrivateFolder(
				this.appName,
				this.appVersion,
				this.arFS,
				this.contentType,
				this.driveId,
				this.entityType,
				this.name,
				this.txId,
				this.unixTime,
				this.parentFolderId,
				this.entityId,
				this.cipher,
				this.cipherIV
			);
		}
		throw new Error('Invalid folder state');
	}
}
