import { ArFSEntity, ContentType, EntityType, GQLTagInterface, GQLTransactionsResultInterface } from 'ardrive-core-js';
import Arweave from 'arweave';
import { ArFSFileOrFolderEntity, graphQLURL } from '../../arfsdao';
import { buildQuery } from '../../query';
import { DriveID, EntityID, FileID, FolderID, TransactionID } from '../../types';

export abstract class ArFSMetadataEntityBuilder<T extends ArFSEntity> {
	appName?: string;
	appVersion?: string;
	arFS?: string;
	contentType?: ContentType;
	driveId?: DriveID;
	entityType?: EntityType;
	name?: string;
	txId?: TransactionID;
	unixTime?: number;

	constructor(protected readonly entityId: EntityID, protected readonly arweave: Arweave) {}

	abstract getGqlQueryParameters(): GQLTagInterface[];
	protected abstract buildEntity(): Promise<T>;

	// Returns any unparsed tags
	protected async parseFromArweave(): Promise<GQLTagInterface[]> {
		const unparsedTags: GQLTagInterface[] = [];
		const gqlQuery = buildQuery(this.getGqlQueryParameters());

		const response = await this.arweave.api.post(graphQLURL, gqlQuery);

		const { data } = response.data;
		const transactions: GQLTransactionsResultInterface = data.transactions;
		const { edges } = transactions;

		if (!edges.length) {
			throw new Error(`Entity with ID ${this.entityId} not found!`);
		}

		const { node } = edges[0];
		const { tags } = node;
		tags.forEach((tag: GQLTagInterface) => {
			const key = tag.name;
			const { value } = tag;
			switch (key) {
				case 'App-Name':
					this.appName = value;
					break;
				case 'App-Version':
					this.appVersion = value;
					break;
				case 'ArFS':
					this.arFS = value;
					break;
				case 'Content-Type':
					this.contentType = value as ContentType;
					break;
				case 'Drive-Id':
					this.driveId = value;
					break;
				case 'Entity-Type':
					this.entityType = value as EntityType;
					break;
				case 'Unix-Time':
					this.unixTime = +value;
					break;
				default:
					unparsedTags.push(tag);
					break;
			}
		});

		// Get the entity's transaction ID
		this.txId = node.id;
		return unparsedTags;
	}

	async build(): Promise<T> {
		await this.parseFromArweave();
		return this.buildEntity();
	}
}

export abstract class ArFSFileOrFolderBuilder<T extends ArFSFileOrFolderEntity> extends ArFSMetadataEntityBuilder<T> {
	parentFolderId?: string;

	constructor(protected readonly entityId: FileID | FolderID, protected readonly arweave: Arweave) {
		super(entityId, arweave);
	}

	protected async parseFromArweave(): Promise<GQLTagInterface[]> {
		const unparsedTags: GQLTagInterface[] = [];
		const tags = await super.parseFromArweave();
		tags.forEach((tag: GQLTagInterface) => {
			const key = tag.name;
			const { value } = tag;
			switch (key) {
				case 'Parent-Folder-Id':
					this.parentFolderId = value;
					break;
				default:
					unparsedTags.push(tag);
					break;
			}
		});

		return unparsedTags;
	}
}
