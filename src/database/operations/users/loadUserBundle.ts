import { loadBundle } from '../generic/loadBundle';
import type { JsonResultSet, Bundle, User, AuthContext } from '../../../types';

export const loadUserBundle = async (
	authContext: AuthContext | undefined,
	authenticationId: string | undefined,
	limit: number | undefined,
	offset: number,
): Promise<Bundle<User>> => {
	const userId = authContext?.user.id;
	const isAdministrator = authContext?.role.isAdministrator;

	const bundle = await loadBundle<JsonResultSet<User>>(
		'users.selectWithPagination',
		{
			authenticationId,
			isAdministrator,
			limit,
			offset,
			userId,
		},
		'users',
	);
	const entries = bundle.entries.map((entry) => entry.object);
	return {
		...bundle,
		entries,
	};
};