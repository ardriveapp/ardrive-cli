import { GQLTagInterface } from 'ardrive-core-js';
import { ArweaveAddress } from './types';

const nodeFragment = `
	node {
		id
		tags {
			name
			value
		}
	}
`;

const edgesFragment = (singleResult: boolean) => `
	edges {
		${singleResult ? '' : 'cursor'}
		${nodeFragment}
	}
`;

const pageInfoFragment = `
	pageInfo {
		hasNextPage
	}
`;

export type GQLQuery = { query: string };

const latestResult = 1;
const pageLimit = 100;

/**
 * Builds a GraphQL query which will only return the latest result
 *
 * TODO: Add parameters and support for all possible upcoming GQL queries
 *
 * @example
 * const query = buildQuery([{ name: 'Folder-Id', value: folderId }]);
 */
export function buildQuery(tags: GQLTagInterface[], cursor?: string, owner?: ArweaveAddress): GQLQuery {
	let queryTags = ``;

	tags.forEach((t) => {
		queryTags = `${queryTags}
				{ name: "${t.name}", values: "${t.value}" }`;
	});

	const singleResult = cursor === undefined;

	return {
		query: `query {
			transactions(
				first: ${singleResult ? latestResult : pageLimit}
				${singleResult ? '' : `after: "${cursor}"`}
				${owner === undefined ? '' : `owners: ["${owner}"]`}
				tags: [
					${queryTags}
				]
			) {
				${singleResult ? '' : pageInfoFragment}
				${edgesFragment(singleResult)}
			}
		}`
	};
}
