import { ajv } from '../ajv';
import type { JSONSchemaType } from 'ajv';

export type Lanuage = string;

export const langaugeSchema: JSONSchemaType<Lanuage> = {
	type: 'string',
	isValidLanguage: true,
};

export const isValidLanguage = ajv.compile(langaugeSchema);
