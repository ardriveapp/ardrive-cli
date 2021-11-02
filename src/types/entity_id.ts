import { Equatable } from './equatable';

const entityIdRegex = /^([a-f]|[0-9]){8}-([a-f]|[0-9]){4}-([a-f]|[0-9]){4}-([a-f]|[0-9]){4}-([a-f]|[0-9]){12}$/;

export class EntityID implements Equatable<EntityID> {
	constructor(protected entityId: string) {
		if (!entityId.match(entityIdRegex)) {
			throw new Error(`Invalid entity ID '${entityId}'!'`);
		}
	}

	[Symbol.toPrimitive](hint?: string): string {
		if (hint === 'number') {
			throw new Error('Entity IDs cannot be interpreted as a number!');
		}

		return this.toString();
	}

	toString(): string {
		return this.entityId;
	}

	valueOf(): string {
		return this.entityId;
	}

	equals(entityId: EntityID): boolean {
		return this.entityId === entityId.entityId;
	}
}

export function EID(entityId: string): EntityID {
	return new EntityID(entityId);
}
