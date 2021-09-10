import { GQLTagInterface } from 'ardrive-core-js';

const edgesFragment = `
	edges {
		node {
			id
			tags {
				name
				value
			}
		}
	}
`;

export type GQLQuery = { query: string };

/**
 * Builds a GraphQL query which will only return the latest result
 *
 * TODO: Add parameters and support for all possible upcoming GQL queries
 *
 * @example
 * const query = buildQuery([{ name: 'Folder-Id', value: folderId }]);
 */
export function buildQuery(tags: GQLTagInterface[]): GQLQuery {
	let queryTags = ``;

	tags.forEach((t) => {
		queryTags = `${queryTags}
				{ name: "${t.name}", values: "${t.value}" }`;
	});

	return {
		query: `query {
			transactions(
				first: 1
				tags: [
					${queryTags}
				]
			) {
				${edgesFragment}
			}
		}`
	};
}
