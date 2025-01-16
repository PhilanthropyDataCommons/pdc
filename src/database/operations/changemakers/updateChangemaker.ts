import { Changemaker, Id, JsonResultSet, KeycloakId } from '../../../types';
import { db } from '../../db';
import { NotFoundError } from '../../../errors';

export const updateChangemaker = async (
	changemakerId: Id,
	keycloakOrganizationId: KeycloakId,
): Promise<Changemaker> => {
	const result = await db.sql<JsonResultSet<Changemaker>>(
		'changemakers.updateById',
		{
			changemakerId,
			keycloakOrganizationId,
		},
	);
	const { object } = result.rows[0] ?? {};
	if (object === undefined) {
		throw new NotFoundError(`Entity not found`, {
			entityType: 'Changemaker',
			lookupValues: {
				changemakerId,
			},
		});
	}
	return object;
};
