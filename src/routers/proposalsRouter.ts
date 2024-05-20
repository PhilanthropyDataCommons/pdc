import express from 'express';
import { proposalsHandlers } from '../handlers/proposalsHandlers';
import { requireAuthentication } from '../middleware';

const proposalsRouter = express.Router();

proposalsRouter.get(
	'/:proposalId',
	requireAuthentication,
	proposalsHandlers.getProposal,
);

proposalsRouter.get(
	'external/:proposalId',
	requireAuthentication,
	proposalsHandlers.getProposalByExternalId,
);

proposalsRouter.get('/', requireAuthentication, proposalsHandlers.getProposals);

proposalsRouter.post(
	'/',
	requireAuthentication,
	proposalsHandlers.postProposal,
);

export { proposalsRouter };
