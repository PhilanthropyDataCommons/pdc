import { db } from '../../db';
import type {
	FunderRole,
	InternallyWritableFunderRole,
	JsonResultSet,
} from '../../../types';

const createOrUpdateFunderRole = async (
	createValues: InternallyWritableFunderRole,
): Promise<FunderRole> => {
	const { userKeycloakUserId, funderShortCode, accessType, createdBy } =
		createValues;
	const result = await db.sql<JsonResultSet<FunderRole>>(
		'funderRoles.insertOrUpdateOne',
		{
			funderShortCode,
			userKeycloakUserId,
			accessType,
			createdBy,
		},
	);

	const { object } = result.rows[0] ?? {};
	if (object === undefined) {
		throw new Error(
			'The entity creation did not appear to fail, but no data was returned by the operation.',
		);
	}
	return object;
};

export { createOrUpdateFunderRole };
