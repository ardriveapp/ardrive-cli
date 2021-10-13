import { ArFSFileOrFolderEntity } from './arfs_entities';
import { FolderID } from './types';

export class FolderTreeNode {
	constructor(
		public readonly folderId: FolderID,
		public readonly parent?: FolderTreeNode,
		public children: FolderTreeNode[] = []
	) {}

	public static fromEntity(folderEntity: ArFSFileOrFolderEntity): FolderTreeNode {
		const node = new FolderTreeNode(folderEntity.entityId);
		return node;
	}
}

export class FolderHierarchy {
	private _rootNode?: FolderTreeNode;

	constructor(
		private readonly folderIdToEntityMap: { [k: string]: ArFSFileOrFolderEntity },
		private readonly folderIdToNodeMap: { [k: string]: FolderTreeNode }
	) {}

	static newFromEntities(entities: ArFSFileOrFolderEntity[]): FolderHierarchy {
		const folderIdToEntityMap = entities.reduce((accumulator, entity) => {
			return Object.assign(accumulator, { [entity.entityId]: entity });
		}, {});
		const folderIdToNodeMap: { [k: string]: FolderTreeNode } = {};

		for (const entity of entities) {
			this.setupNodesWithEntity(entity, folderIdToEntityMap, folderIdToNodeMap);
		}

		return new FolderHierarchy(folderIdToEntityMap, folderIdToNodeMap);
	}

	private static setupNodesWithEntity(
		entity: ArFSFileOrFolderEntity,
		folderIdToEntityMap: { [k: string]: ArFSFileOrFolderEntity },
		folderIdToNodeMap: { [k: string]: FolderTreeNode }
	): void {
		const folderIdKeyIsPresent = Object.keys(folderIdToNodeMap).includes(entity.entityId);
		const parentFolderIdKeyIsPresent = Object.keys(folderIdToNodeMap).includes(entity.parentFolderId);
		if (!folderIdKeyIsPresent) {
			if (!parentFolderIdKeyIsPresent) {
				const parentFolderEntity = folderIdToEntityMap[entity.parentFolderId];
				if (parentFolderEntity) {
					this.setupNodesWithEntity(parentFolderEntity, folderIdToEntityMap, folderIdToNodeMap);
				}
			}
			const parent = folderIdToNodeMap[entity.parentFolderId];
			if (parent) {
				const node = new FolderTreeNode(entity.entityId, parent);
				parent.children.push(node);
				folderIdToNodeMap[entity.entityId] = node;
			} else {
				// this one is supposed to be the new root
				const rootNode = new FolderTreeNode(entity.entityId);
				folderIdToNodeMap[entity.entityId] = rootNode;
			}
		}
	}

	public get rootNode(): FolderTreeNode {
		if (this._rootNode) {
			return this._rootNode;
		}

		const someFolderId = Object.keys(this.folderIdToEntityMap)[0];
		let tmpNode = this.folderIdToNodeMap[someFolderId];
		while (tmpNode.parent && this.folderIdToNodeMap[tmpNode.parent.folderId]) {
			tmpNode = tmpNode.parent;
		}
		this._rootNode = tmpNode;
		return tmpNode;
	}

	public subTreeOf(folderId: FolderID, maxDepth = Number.MAX_SAFE_INTEGER): FolderHierarchy {
		const newRootNode = this.folderIdToNodeMap[folderId];

		const subTreeNodes = this.nodeAndChildrenOf(newRootNode, maxDepth);

		const entitiesMapping = subTreeNodes.reduce((accumulator, node) => {
			return Object.assign(accumulator, { [node.folderId]: this.folderIdToEntityMap[node.folderId] });
		}, {});
		const nodesMapping = subTreeNodes.reduce((accumulator, node) => {
			return Object.assign(accumulator, { [node.folderId]: node });
		}, {});

		return new FolderHierarchy(entitiesMapping, nodesMapping);
	}

	public allFolderIDs(): FolderID[] {
		return Object.keys(this.folderIdToEntityMap);
	}

	public nodeAndChildrenOf(node: FolderTreeNode, maxDepth: number): FolderTreeNode[] {
		const subTreeEntities: FolderTreeNode[] = [node];
		if (maxDepth > 0) {
			node.children.forEach((child) => {
				subTreeEntities.push(...this.nodeAndChildrenOf(child, maxDepth - 1));
			});
		}
		return subTreeEntities;
	}

	public folderIdSubtreeFromFolderId(folderId: FolderID, maxDepth: number): FolderID[] {
		const rootNode = this.folderIdToNodeMap[folderId];
		const subTree: FolderID[] = [rootNode.folderId];
		switch (maxDepth) {
			case -1:
				// Recursion stopping condition - hit the max allowable depth
				break;
			default: {
				// Recursion stopping condition - no further child nodes to recurse to
				rootNode.children
					.map((node) => node.folderId)
					.forEach((childFolderID) => {
						subTree.push(...this.folderIdSubtreeFromFolderId(childFolderID, maxDepth - 1));
					});
				break;
			}
		}
		return subTree;
	}

	public pathToFolderId(folderId: FolderID): string {
		if (this.rootNode.parent) {
			throw new Error(`Can't compute paths from sub-tree`);
		}
		if (folderId === 'root folder') {
			return '/';
		}
		let folderNode = this.folderIdToNodeMap[folderId];
		const nodesInPathToFolder = [folderNode];
		while (folderNode.parent && folderNode.folderId !== this.rootNode.folderId) {
			folderNode = folderNode.parent;
			nodesInPathToFolder.push(folderNode);
		}
		const olderFirstNodesInPathToFolder = nodesInPathToFolder.reverse();
		const olderFirstNamesOfNodesInPath = olderFirstNodesInPathToFolder.map(
			(n) => this.folderIdToEntityMap[n.folderId].name
		);
		const stringPath = olderFirstNamesOfNodesInPath.join('/');
		return `/${stringPath}/`;
	}

	public entityPathToFolderId(folderId: FolderID): string {
		if (this.rootNode.parent) {
			throw new Error(`Can't compute paths from sub-tree`);
		}
		if (folderId === 'root folder') {
			return '/';
		}
		let folderNode = this.folderIdToNodeMap[folderId];
		const nodesInPathToFolder = [folderNode];
		while (folderNode.parent && folderNode.folderId !== this.rootNode.folderId) {
			folderNode = folderNode.parent;
			nodesInPathToFolder.push(folderNode);
		}
		const olderFirstNodesInPathToFolder = nodesInPathToFolder.reverse();
		const olderFirstFolderIDsOfNodesInPath = olderFirstNodesInPathToFolder.map((n) => n.folderId);
		const stringPath = olderFirstFolderIDsOfNodesInPath.join('/');
		return `/${stringPath}/`;
	}

	public txPathToFolderId(folderId: FolderID): string {
		if (this.rootNode.parent) {
			throw new Error(`Can't compute paths from sub-tree`);
		}
		if (folderId === 'root folder') {
			return '/';
		}
		let folderNode = this.folderIdToNodeMap[folderId];
		const nodesInPathToFolder = [folderNode];
		while (folderNode.parent && folderNode.folderId !== this.rootNode.folderId) {
			folderNode = folderNode.parent;
			nodesInPathToFolder.push(folderNode);
		}
		const olderFirstNodesInPathToFolder = nodesInPathToFolder.reverse();
		const olderFirstTxTDsOfNodesInPath = olderFirstNodesInPathToFolder.map(
			(n) => this.folderIdToEntityMap[n.folderId].txId
		);
		const stringPath = olderFirstTxTDsOfNodesInPath.join('/');
		return `/${stringPath}/`;
	}
}
