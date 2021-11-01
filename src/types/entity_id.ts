const entityIdRegex = /^([a-f]|[0-9]){8}-([a-f]|[0-9]){4}-([a-f]|[0-9]){4}-([a-f]|[0-9]){4}-([a-f]|[0-9]){12}$/;

export class EntityID {
	constructor(private readonly entityId: string) {
		if (!entityId.match(entityIdRegex)) {
			throw new Error(`Invalid entity ID '${entityId}'!'`);
		}
	}

	toString(): string {
		return this.entityId;
	}

	valueOf(): string {
		return this.entityId;
	}

	isEqualTo(entityId: EntityID): boolean {
		return `${this.entityId}` === `${entityId}`;
	}
}

export function EID(entityId: string): EntityID {
	return new EntityID(entityId);
}
