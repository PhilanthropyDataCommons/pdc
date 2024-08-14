import { ajv } from '../ajv';
import type { JSONSchemaType } from 'ajv';
import type { Writable } from './Writable';

export enum BaseFieldDataType {
	STRING = 'string',
	NUMBER = 'number',
	PHONE_NUMBER = 'phone_number',
	EMAIL = 'email',
	URL = 'url',
	BOOLEAN = 'boolean',
}

export enum BaseFieldScope {
	PROPOSAL = 'proposal',
	ORGANIZATION = 'organization',
}

interface BaseField {
	readonly id: number;
	defaultLabel: string;
	defaultDescription: string;
	shortCode: string;
	dataType: BaseFieldDataType;
	scope: BaseFieldScope;
	readonly createdAt: string;
}

type WritableBaseField = Writable<BaseField>;

const writableBaseFieldSchema: JSONSchemaType<WritableBaseField> = {
	type: 'object',
	properties: {
		defaultLabel: {
			type: 'string',
		},
		defaultDescription: {
			type: 'string',
		},
		shortCode: {
			type: 'string',
		},
		dataType: {
			type: 'string',
			enum: Object.values(BaseFieldDataType),
		},
		scope: {
			type: 'string',
			enum: Object.values(BaseFieldScope),
		},
	},
	required: [
		'defaultLabel',
		'defaultDescription',
		'shortCode',
		'dataType',
		'scope',
	],
};

const isWritableBaseField = ajv.compile(writableBaseFieldSchema);

export {
	BaseField,
	isWritableBaseField,
	WritableBaseField,
	writableBaseFieldSchema,
};
