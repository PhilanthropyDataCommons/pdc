import { db } from '../../db';
import { NotFoundError } from '../../../errors';
import { getKeycloakUserIdFromAuthContext, keycloakUserIdToString } from '../../../types';
import type {
	AccessType,
	AuthContext,
	Id,
	JsonResultSet,
	Changemaker,
	KeycloakUserId,
} from '../../../types';

export const loadChangemakerRole = async (
	authContext: AuthContext | undefined,
	changemakerId: Id,
	userKeycloakUserId: KeycloakUserId,
	accessType: AccessType,
): Promise<Changemaker> => {
	const keycloakUserId = getKeycloakUserIdFromAuthContext(authContext);
	const result = await db.sql<JsonResultSet<Changemaker>>(
		'changemakerRoles.selectByPrimaryKey',
		{
			changemakerId,
			userKeycloakUserId,
			accessType
		},
	);
	const { object } = result.rows[0] ?? {};
	if (object === undefined) {
		throw new NotFoundError(`Entity not found`, {
			entityType: 'ChangemakerRole',
			entityPrimaryKey: {
				changemakerId,
				userKeycloakUserId: keycloakUserIdToString(userKeycloakUserId),
				accessType
			},
		});
	}
	return object;
};
