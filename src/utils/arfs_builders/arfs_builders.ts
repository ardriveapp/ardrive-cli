import {
	ContentType,
	EntityType,
	GQLNodeInterface,
	GQLTagInterface,
	GQLTransactionsResultInterface
} from 'ardrive-core-js';
import Arweave from 'arweave';
import { graphQLURL } from '../../arfsdao';
import { ArFSEntity, ArFSFileOrFolderEntity } from '../../arfs_entities';
import { ArweaveAddress } from '../../types/arweave_address';
import { buildQuery } from '../../query';
import { DriveID, AnyEntityID, EntityKey, FolderID, UnixTime } from '../../types';
import { TransactionID, TxID } from '../../types/';
import { EID } from '../../types/entity_id';

export interface ArFSMetadataEntityBuilderParams {
	entityId: AnyEntityID;
	arweave: Arweave;
	owner?: ArweaveAddress;
}
export type ArFSPublicMetadataEntityBuilderParams = ArFSMetadataEntityBuilderParams;
export interface ArFSPrivateMetadataEntityBuilderParams extends ArFSMetadataEntityBuilderParams {
	key: EntityKey;
}

export type ArFSMetadataEntityBuilderFactoryFunction<
	T extends ArFSEntity,
	B extends ArFSMetadataEntityBuilder<T>,
	P extends ArFSMetadataEntityBuilderParams
> = (params: P) => B;

export abstract class ArFSMetadataEntityBuilder<T extends ArFSEntity> {
	appName?: string;
	appVersion?: string;
	arFS?: string;
	contentType?: ContentType;
	driveId?: DriveID;
	entityType?: EntityType;
	name?: string;
	txId?: TransactionID;
	unixTime?: UnixTime;
	protected readonly entityId: AnyEntityID;
	protected readonly arweave: Arweave;
	protected readonly owner?: ArweaveAddress;

	constructor({ entityId, arweave, owner }: ArFSMetadataEntityBuilderParams) {
		this.entityId = entityId;
		this.arweave = arweave;
		this.owner = owner;
	}

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
			const gqlQuery = buildQuery({ tags: this.getGqlQueryParameters(), owner });

			const response = await this.arweave.api.post(graphQLURL, gqlQuery);

			const { data } = response.data;
			const transactions: GQLTransactionsResultInterface = data.transactions;
			const { edges } = transactions;

			if (!edges.length) {
				throw new Error(`Entity with ID ${this.entityId} not found!`);
			}

			node = edges[0].node;
		}
		this.txId = TxID(node.id);
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
					this.driveId = EID(value);
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

	async build(node?: GQLNodeInterface): Promise<T> {
		await this.parseFromArweaveNode(node, this.owner);
		return this.buildEntity();
	}
}

export abstract class ArFSFileOrFolderBuilder<T extends ArFSFileOrFolderEntity> extends ArFSMetadataEntityBuilder<T> {
	parentFolderId?: FolderID;

	protected async parseFromArweaveNode(node?: GQLNodeInterface): Promise<GQLTagInterface[]> {
		const unparsedTags: GQLTagInterface[] = [];
		const tags = await super.parseFromArweaveNode(node);
		tags.forEach((tag: GQLTagInterface) => {
			const key = tag.name;
			const { value } = tag;
			switch (key) {
				case 'Parent-Folder-Id':
					this.parentFolderId = EID(value);
					break;
				default:
					unparsedTags.push(tag);
					break;
			}
		});

		return unparsedTags;
	}
}
