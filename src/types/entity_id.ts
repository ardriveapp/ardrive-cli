import { Equatable } from './equatable';

// RFC 4122 Section 3 requires that the characters be generated in lower case, while being case-insensitive on input.
const entityIdRegex = /^[a-f\d]{8}-([a-f\d]{4}-){3}[a-f\d]{12}$/i;

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

	toJSON(): string {
		return this.toString();
	}
}

export function EID(entityId: string): EntityID {
	return new EntityID(entityId);
}
