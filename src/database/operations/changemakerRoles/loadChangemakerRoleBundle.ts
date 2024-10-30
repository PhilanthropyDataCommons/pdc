import { loadBundle } from '../generic/loadBundle';
import { getGlobalRoleFromAuthContext, getKeycloakUserIdFromAuthContext } from '../../../types';
import type {
	AuthContext,
	Bundle,
	JsonResultSet,
	Changemaker,
	Id,
	KeycloakUserId,
	AccessType,
} from '../../../types';

const loadChangemakerRoleBundle = async (
	authContext: AuthContext | undefined,
	changemakerId: Id | undefined,
	userKeycloakUserId: KeycloakUserId | undefined,
	accessType: AccessType | undefined,
	limit: number | undefined,
	offset: number,
): Promise<Bundle<Changemaker>> => {
	const authKeycloakUserId = getKeycloakUserIdFromAuthContext(authContext);
	const globalRole = getGlobalRoleFromAuthContext(authContext);
	const jsonResultSetBundle = await loadBundle<JsonResultSet<Changemaker>>(
		'changemakerRoles.selectWithPagination',
		{
			authKeycloakUserId,
			authIsAdministrator: globalRole?.isAdministrator,
			limit,
			offset,
			changemakerId,
			userKeycloakUserId,
			accessType,
		},
		'changemakers',
	);
	const entries = jsonResultSetBundle.entries.map((entry) => entry.object);
	return {
		...jsonResultSetBundle,
		entries,
	};
};

export { loadChangemakerRoleBundle }
