import { db } from '../../db';
import { NotFoundError } from '../../../errors';
import type {
	AuthContext,
	Id,
	JsonResultSet,
	Organization,
} from '../../../types';

export const loadOrganization = async (
	authContext: AuthContext | undefined,
	id: Id,
): Promise<Organization> => {
	const authenticationId = authContext?.user?.authenticationId;
	const result = await db.sql<JsonResultSet<Organization>>(
		'organizations.selectById',
		{
			id,
			authenticationId,
		},
	);
	const { object } = result.rows[0] ?? {};
	if (object === undefined) {
		throw new NotFoundError(`Entity not found`, {
			entityType: 'Organization',
			entityId: id,
		});
	}
	return object;
};