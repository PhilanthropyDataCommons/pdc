import { ajv } from '../ajv';
import { nullable } from './nullable';
import type { JSONSchemaType } from 'ajv';

export interface ApplicationFormField {
  readonly id: number;
  applicationFormId: number;
  canonicalFieldId: number;
  position: number;
  label: string;
  externalId: string | null;
  readonly createdAt: Date;
}

export type ApplicationFormFieldWrite = Omit<ApplicationFormField, 'applicationFormId' | 'createdAt' | 'id'>;

export const applicationFormFieldSchema: JSONSchemaType<ApplicationFormField> = {
  type: 'object',
  properties: {
    id: {
      type: 'integer',
    },
    applicationFormId: {
      type: 'integer',
    },
    canonicalFieldId: {
      type: 'integer',
    },
    position: {
      type: 'integer',
    },
    label: {
      type: 'string',
    },
    externalId: nullable({
      type: 'string',
    }),
    createdAt: {
      type: 'object',
      required: [],
      instanceof: 'Date',
    },
  },
  required: [
    'id',
    'applicationFormId',
    'canonicalFieldId',
    'position',
    'label',
    'externalId',
    'createdAt',
  ],
};

export const isApplicationFormField = ajv.compile(applicationFormFieldSchema);

export const applicationFormFieldWriteSchema: JSONSchemaType<ApplicationFormFieldWrite> = {
  type: 'object',
  properties: {
    canonicalFieldId: {
      type: 'integer',
    },
    position: {
      type: 'integer',
    },
    label: {
      type: 'string',
    },
    externalId: nullable({
      type: 'string',
    }),
  },
  required: [
    'canonicalFieldId',
    'position',
    'label',
    'externalId',
  ],
};

const applicationFormFieldArraySchema: JSONSchemaType<ApplicationFormField[]> = {
  type: 'array',
  items: applicationFormFieldSchema,
};

export const isApplicationFormFieldArray = ajv.compile(applicationFormFieldArraySchema);
