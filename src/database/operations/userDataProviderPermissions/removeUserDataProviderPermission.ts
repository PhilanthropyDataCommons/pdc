import { NotFoundError } from '../../../errors';
import { keycloakIdToString } from '../../../types';
import { db } from '../../db';
import type { KeycloakId, Permission, ShortCode } from '../../../types';

const removeUserDataProviderPermission = async (
	userKeycloakUserId: KeycloakId,
	dataProviderShortCode: ShortCode,
	permission: Permission,
): Promise<void> => {
	const result = await db.sql('userDataProviderPermissions.deleteOne', {
		userKeycloakUserId,
		dataProviderShortCode,
		permission,
	});

	if (result.row_count === 0) {
		throw new NotFoundError(
			'The item did not exist and could not be deleted.',
			{
				entityType: 'UserDataProviderPermission',
				entityPrimaryKey: {
					userKeycloakUserId: keycloakIdToString(userKeycloakUserId),
					dataProviderShortCode,
					permission,
				},
			},
		);
	}
};

export { removeUserDataProviderPermission };