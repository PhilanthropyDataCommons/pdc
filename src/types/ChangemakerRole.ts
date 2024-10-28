import { ajv } from '../ajv';
import { AccessType } from './AccessType';
import type { JSONSchemaType } from 'ajv';
import type { Writable } from './Writable';
import type { KeycloakUserId } from './KeycloakUserId';

interface ChangemakerRole {
	readonly changemakerId: number;
	readonly userKeycloakUserId: KeycloakUserId;
	readonly accessType: AccessType;
	readonly createdBy: KeycloakUserId;
	readonly createdAt: string;
}

type WritableChangemakerRole = Writable<ChangemakerRole>;

type InternallyWritableChangemakerRole = WritableChangemakerRole &
	Pick<
		ChangemakerRole,
		'changemakerId' | 'userKeycloakUserId' | 'accessType' | 'createdBy'
	>;

const writableChangemakerRoleSchema: JSONSchemaType<WritableChangemakerRole> = {
	type: 'object',
	properties: {},
	required: [],
};

const isWritableChangemakerRole = ajv.compile(writableChangemakerRoleSchema);

export {
	ChangemakerRole,
	InternallyWritableChangemakerRole,
	isWritableChangemakerRole,
	WritableChangemakerRole,
};
