import { db } from '../../db';
import type {
	DataProviderRole,
	InternallyWritableDataProviderRole,
	JsonResultSet,
} from '../../../types';

const createOrUpdateDataProviderRole = async (
	createValues: InternallyWritableDataProviderRole,
): Promise<DataProviderRole> => {
	const { userKeycloakUserId, dataProviderShortCode, accessType, createdBy } =
		createValues;
	const result = await db.sql<JsonResultSet<DataProviderRole>>(
		'dataProviderRoles.insertOrUpdateOne',
		{
			dataProviderShortCode,
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

export { createOrUpdateDataProviderRole };
