import {
	ArFSEntity,
	ContentType,
	EntityType,
	GQLNodeInterface,
	GQLTagInterface,
	GQLTransactionsResultInterface
} from 'ardrive-core-js';
import Arweave from 'arweave';
import { ArFSFileOrFolderEntity, graphQLURL } from '../../arfsdao';
import { buildQuery } from '../../query';
import { ArweaveAddress, DriveID, EntityID, FileID, FolderID, TransactionID } from '../../types';

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

	/**
	 * Parses data for builder fields from either the provided GQL tags, or from a fresh request to Arweave for tag data
	 *
	 * @param node (optional) a pre-fetched GQL node containing the txID and tags that will be parsed out of the on-chain data
	 *
	 * @param owner (optional) filter all transactions out by owner's public arweave address
	 *
	 * @returns an array of unparsed tags
	 */
	protected async parseFromArweaveNode(node?: GQLNodeInterface, owner?: ArweaveAddress): Promise<GQLTagInterface[]> {
		const unparsedTags: GQLTagInterface[] = [];
		if (!node) {
			const gqlQuery = buildQuery(this.getGqlQueryParameters(), undefined, owner);

			const response = await this.arweave.api.post(graphQLURL, gqlQuery);

			const { data } = response.data;
			const transactions: GQLTransactionsResultInterface = data.transactions;
			const { edges } = transactions;

			if (!edges.length) {
				throw new Error(`Entity with ID ${this.entityId} not found!`);
			}

			node = edges[0].node;
		}
		this.txId = node.id;
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

		return unparsedTags;
	}

	async build(node?: GQLNodeInterface, owner?: ArweaveAddress): Promise<T> {
		await this.parseFromArweaveNode(node, owner);
		return this.buildEntity();
	}
}

export abstract class ArFSFileOrFolderBuilder<T extends ArFSFileOrFolderEntity> extends ArFSMetadataEntityBuilder<T> {
	parentFolderId?: FolderID;

	constructor(protected readonly entityId: FileID | FolderID, protected readonly arweave: Arweave) {
		super(entityId, arweave);
	}

	protected async parseFromArweaveNode(node?: GQLNodeInterface): Promise<GQLTagInterface[]> {
		const unparsedTags: GQLTagInterface[] = [];
		const tags = await super.parseFromArweaveNode(node);
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
