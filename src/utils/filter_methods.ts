import { ArFSFileOrFolderEntity } from '../arfsdao';

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
