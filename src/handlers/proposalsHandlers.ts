import {
	createProposal,
	getLimitValues,
	loadProposal,
	loadProposalBundle,
} from '../database';
import {
	AuthenticatedRequest,
	isAuthContext,
	isTinyPgErrorWithQueryContext,
	isWritableProposal,
} from '../types';
import {
	DatabaseError,
	FailedMiddlewareError,
	InputValidationError,
} from '../errors';
import {
	extractCreatedByParameters,
	extractOrganizationParameters,
	extractPaginationParameters,
	extractSearchParameters,
} from '../queryParameters';
import type { Request, Response, NextFunction } from 'express';

const getProposals = (
	req: AuthenticatedRequest,
	res: Response,
	next: NextFunction,
): void => {
	if (!isAuthContext(req)) {
		next(new FailedMiddlewareError('Unexpected lack of auth context.'));
		return;
	}
	const paginationParameters = extractPaginationParameters(req);
	const searchParameters = extractSearchParameters(req);
	const organizationParameters = extractOrganizationParameters(req);
	const createdByParameters = extractCreatedByParameters(req);

	(async () => {
		const proposalBundle = await loadProposalBundle(
			{
				...getLimitValues(paginationParameters),
				...searchParameters,
				...organizationParameters,
				...createdByParameters,
			},
			req,
		);

		res.status(200).contentType('application/json').send(proposalBundle);
	})().catch((error: unknown) => {
		if (isTinyPgErrorWithQueryContext(error)) {
			next(new DatabaseError('Error retrieving proposals.', error));
			return;
		}
		next(error);
	});
};

const getProposal = (
	req: Request<{ id: string }>,
	res: Response,
	next: NextFunction,
): void => {
	const id = Number.parseInt(req.params.id, 10);
	if (Number.isNaN(id)) {
		next(new InputValidationError('The entity id must be a number.', []));
		return;
	}
	loadProposal(id)
		.then((proposal) => {
			res.status(200).contentType('application/json').send(proposal);
		})
		.catch((error: unknown) => {
			if (isTinyPgErrorWithQueryContext(error)) {
				next(new DatabaseError('Error loading the proposal.', error));
				return;
			}
			next(error);
		});
};

const postProposal = (
	req: AuthenticatedRequest,
	res: Response,
	next: NextFunction,
): void => {
	if (req.user === undefined) {
		next(new FailedMiddlewareError('Unexpected lack of user context.'));
		return;
	}
	if (!isWritableProposal(req.body)) {
		next(
			new InputValidationError(
				'Invalid request body.',
				isWritableProposal.errors ?? [],
			),
		);
		return;
	}

	const { externalId, opportunityId } = req.body;
	const createdBy = req.user.id;

	createProposal({
		opportunityId,
		externalId,
		createdBy,
	})
		.then((proposal) => {
			res.status(201).contentType('application/json').send(proposal);
		})
		.catch((error: unknown) => {
			if (isTinyPgErrorWithQueryContext(error)) {
				next(new DatabaseError('Error creating proposal.', error));
				return;
			}
			next(error);
		});
};

export const proposalsHandlers = {
	getProposal,
	getProposals,
	postProposal,
};
