import { ajv } from '../ajv';
import type { JSONSchemaType } from 'ajv';

type ProposalExternalId = string;

const proposalExternalIdSchema: JSONSchemaType<ProposalExternalId> = {
	type: 'string',
};

const isProposalExternalId = ajv.compile(proposalExternalIdSchema);

export {
	isProposalExternalId,
	proposalExternalIdSchema,
	ProposalExternalId,
}
