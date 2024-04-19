import { ajv } from '../ajv';
import { InputValidationError } from '../errors';
import type { JSONSchemaType } from 'ajv';
import type { Request } from 'express';

interface CreatedByParameters {
	createdBy: number | undefined;
}

interface CreatedByParametersQuery {
	createdBy: number | undefined;
}

const createdByParametersQuerySchema: JSONSchemaType<CreatedByParametersQuery> =
	{
		type: 'object',
		properties: {
			createdBy: {
				type: 'integer',
				minimum: 1,
				nullable: true,
			},
		},
		required: [],
	};

const isCreatedByParametersQuery = ajv.compile(createdByParametersQuerySchema);

const extractCreatedByParameters = (request: Request): CreatedByParameters => {
	const { query } = request;
	if (!isCreatedByParametersQuery(query)) {
		throw new InputValidationError(
			'Invalid createdBy parameters.',
			isCreatedByParametersQuery.errors ?? [],
		);
	}
	return {
		createdBy: query.createdBy,
	};
};

export { extractCreatedByParameters };
