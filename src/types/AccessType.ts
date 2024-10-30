import { ajv } from '../ajv';
import type { JSONSchemaType } from 'ajv';

enum AccessType {
	MANAGE = 'manage',
	EDIT = 'edit',
	VIEW = 'view',
}

const acessTypeSchema: JSONSchemaType<AccessType> = {
	type: 'string',
	enum: Object.values(AccessType),
};

const isAccessType = ajv.compile(acessTypeSchema);

export {
	AccessType,
	isAccessType,
};
