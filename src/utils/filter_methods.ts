import { ArFSFileOrFolderEntity } from '../arfsdao';
import { FolderID } from '../types';

/**
 * @name lastRevisionFilter is a standard JS find/filter function intended to
 * filter only the last revision of entities within an array
 *
 * @param {ArFSFileOrFolderEntity} entity the iterated entity
 * @param {number} _index the iterated index
 * @param {ArFSFileOrFolderEntity[]} allEntities the array of all entities
 * @returns {boolean}
 */
export function latestRevisionFilter(
	entity: ArFSFileOrFolderEntity,
	_index: number,
	allEntities: ArFSFileOrFolderEntity[]
): boolean {
	const allRevisions = allEntities.filter((e) => e.entityId === entity.entityId);
	const latestRevision = allRevisions[0];
	return entity.txId === latestRevision.txId;
}

/**
 * @name childrenAndFolderOfFilterFactory is a factory function for a standard find/filter function
 * which filters all children and self of a specific folder
 *
 * @param {FolderID[]} folderIDs an array of the parent folder IDs to query for
 * @returns the find/filter function
 */
export const childrenAndFolderOfFilterFactory = (folderIDs: FolderID[]) =>
	function (entity: ArFSFileOrFolderEntity): boolean {
		return folderIDs.includes(entity.parentFolderId) || folderIDs.includes(entity.entityId);
	};
