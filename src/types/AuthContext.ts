import { ajv } from '../ajv';
import { userSchema } from './User';
import type { JSONSchemaType } from 'ajv';
import type { User } from './User';
import type { KeycloakUserId } from './KeycloakUserId';

interface GlobalRole {
	isAdministrator: boolean;
}

interface AuthContext {
	user: User;
	role: GlobalRole;
}

const authContextSchema: JSONSchemaType<AuthContext> = {
	type: 'object',
	properties: {
		user: userSchema,
		role: {
			type: 'object',
			properties: {
				isAdministrator: {
					type: 'boolean',
				},
			},
			required: ['isAdministrator'],
		},
	},
	required: ['user', 'role'],
};

const isAuthContext = ajv.compile(authContextSchema);

const getKeycloakUserIdFromAuthContext = (
	req: AuthContext | undefined,
): KeycloakUserId | undefined => {
	const keycloakUserId = req?.user?.keycloakUserId;
	return keycloakUserId;
};

const getGlobalRoleFromAuthContext = (
	req: AuthContext | undefined,
): GlobalRole | undefined => {
	const role = req?.role;
	return role;
};

export {
	AuthContext,
	authContextSchema,
	isAuthContext,
	getGlobalRoleFromAuthContext,
	getKeycloakUserIdFromAuthContext,
};
