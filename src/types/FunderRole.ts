import { ajv } from '../ajv';
import { AccessType } from './AccessType';
import type { JSONSchemaType } from 'ajv';
import type { Writable } from './Writable';
import type { ShortCode } from './ShortCode';
import type { KeycloakUserId } from './KeycloakUserId';

interface FunderRole {
	readonly funderShortCode: ShortCode;
	readonly userKeycloakUserId: KeycloakUserId;
	readonly accessType: AccessType;
	readonly createdBy: KeycloakUserId;
	readonly createdAt: string;
}

type WritableFunderRole = Writable<FunderRole>;

type InternallyWritableFunderRole = WritableFunderRole &
	Pick<
		FunderRole,
		'funderShortCode' | 'userKeycloakUserId' | 'accessType' | 'createdBy'
	>;

const writableFunderRoleSchema: JSONSchemaType<WritableFunderRole> = {
	type: 'object',
	properties: {},
	required: [],
};

const isWritableFunderRole = ajv.compile(writableFunderRoleSchema);

export {
	FunderRole,
	InternallyWritableFunderRole,
	isWritableFunderRole,
	WritableFunderRole,
};
