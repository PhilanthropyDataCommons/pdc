import { ajv } from '../ajv';
import { AccessType } from './AccessType';
import type { JSONSchemaType } from 'ajv';
import type { Writable } from './Writable';
import type { ShortCode } from './ShortCode';
import type { KeycloakUserId } from './KeycloakUserId';

interface DataProviderRole {
	readonly dataProviderShortCode: ShortCode;
	readonly userKeycloakUserId: KeycloakUserId;
	readonly accessType: AccessType;
	readonly createdBy: KeycloakUserId;
	readonly createdAt: string;
}

type WritableDataProviderRole = Writable<DataProviderRole>;

type InternallyWritableDataProviderRole = WritableDataProviderRole &
	Pick<
		DataProviderRole,
		'dataProviderShortCode' | 'userKeycloakUserId' | 'accessType' | 'createdBy'
	>;

const writableDataProviderSchema: JSONSchemaType<WritableDataProviderRole> = {
	type: 'object',
	properties: {},
	required: [],
};

const isWritableDataProviderRole = ajv.compile(writableDataProviderSchema);

export {
	DataProviderRole,
	InternallyWritableDataProviderRole,
	isWritableDataProviderRole,
	WritableDataProviderRole,
};
