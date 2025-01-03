import { generateLoadBundleOperation } from '../generators';
import type { Changemaker, KeycloakId } from '../../../types';

const loadChangemakerBundle = generateLoadBundleOperation<
	Changemaker,
	[keycloakUserId: KeycloakId | undefined, proposalId: number | undefined]
>('changemakers.selectWithPagination', 'changemakers', [
	'keycloakUserId',
	'proposalId',
]);

export { loadChangemakerBundle };
