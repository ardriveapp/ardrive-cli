import { ArFSDriveEntity } from 'ardrive-core-js';
import { ArFSFileOrFolderEntity } from '../arfs_entities';

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
 * @name latestRevisionFilterForDrives is a standard JS find/filter function intended to
 * filter only the last revision of entities within an array
 *
 * @param {ArFSDriveEntity} entity the iterated entity
 * @param {number} _index the iterated index
 * @param {ArFSDriveEntity[]} allEntities the array of all entities
 * @returns {boolean}
 */
export function latestRevisionFilterForDrives(
	entity: ArFSDriveEntity,
	_index: number,
	allEntities: ArFSDriveEntity[]
): boolean {
	const allRevisions = allEntities.filter((e) => e.driveId === entity.driveId);
	const latestRevision = allRevisions[0];
	return entity.txId === latestRevision.txId;
}
