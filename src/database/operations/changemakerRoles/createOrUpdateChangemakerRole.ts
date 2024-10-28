import { db } from '../../db';
import type {
	DataProviderRole,
	InternallyWritableChangemakerRole,
	JsonResultSet,
} from '../../../types';

const createOrUpdateChangemakerRole = async (
	createValues: InternallyWritableChangemakerRole,
): Promise<DataProviderRole> => {
	const { userKeycloakUserId, changemakerId, accessType, createdBy } =
		createValues;
	const result = await db.sql<JsonResultSet<DataProviderRole>>(
		'changemakerRoles.insertOrUpdateOne',
		{
			changemakerId,
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

export { createOrUpdateChangemakerRole };
