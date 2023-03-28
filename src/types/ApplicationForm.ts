import { ajv } from '../ajv';
import {
  applicationFormFieldSchema,
  applicationFormFieldWriteSchema,
} from './ApplicationFormField';
import { nullable } from './nullable';
import type { JSONSchemaType } from 'ajv';
import type {
  ApplicationFormField,
  ApplicationFormFieldWrite,
} from './ApplicationFormField';

export interface ApplicationForm {
  readonly id: number;
  opportunityId: number;
  version: number;
  externalId: string | null;
  fields?: ApplicationFormField[];
  readonly createdAt: Date;
}

// See https://github.com/typescript-eslint/typescript-eslint/issues/1824
/* eslint-disable @typescript-eslint/indent */
export type ApplicationFormWrite = Omit<ApplicationForm, 'createdAt' | 'fields' | 'id' | 'version'>
  & { fields: ApplicationFormFieldWrite[] };
/* eslint-enable @typescript-eslint/indent */

export const applicationFormSchema: JSONSchemaType<ApplicationForm> = {
  type: 'object',
  properties: {
    id: {
      type: 'integer',
    },
    opportunityId: {
      type: 'integer',
    },
    version: {
      type: 'integer',
    },
    externalId: nullable({
      type: 'string',
    }),
    fields: {
      type: 'array',
      items: applicationFormFieldSchema,
      nullable: true,
    },
    createdAt: {
      type: 'object',
      required: [],
      instanceof: 'Date',
    },
  },
  required: [
    'id',
    'opportunityId',
    'version',
    'externalId',
    'createdAt',
  ],
};

export const isApplicationForm = ajv.compile(applicationFormSchema);

export const applicationFormWriteSchema: JSONSchemaType<ApplicationFormWrite> = {
  type: 'object',
  properties: {
    opportunityId: {
      type: 'number',
    },
    externalId: nullable({
      type: 'string',
    }),
    fields: {
      type: 'array',
      items: applicationFormFieldWriteSchema,
    },
  },
  required: [
    'opportunityId',
    'externalId',
    'fields',
  ],
};

export const isApplicationFormWrite = ajv.compile(applicationFormWriteSchema);

const applicationFormArraySchema: JSONSchemaType<ApplicationForm[]> = {
  type: 'array',
  items: applicationFormSchema,
};

export const isApplicationFormArray = ajv.compile(applicationFormArraySchema);
