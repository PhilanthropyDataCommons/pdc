import {
	assertProposalAuthorization,
	createProposal,
	getLimitValues,
	loadProposal,
	loadProposalBundle,
} from '../database';
import {
	AuthenticatedRequest,
	isId,
	isAuthContext,
	isTinyPgErrorWithQueryContext,
	isWritableProposal,
	isProposalExternalId,
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
import type { Response, NextFunction } from 'express';

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
	req: AuthenticatedRequest,
	res: Response,
	next: NextFunction,
): void => {
	if (!isAuthContext(req)) {
		next(new FailedMiddlewareError('Unexpected lack of auth context.'));
		return;
	}
	const { proposalId } = req.params;
	if (!isId(proposalId)) {
		next(new InputValidationError('Invalid id parameter.', isId.errors ?? []));
		return;
	}
	(async () => {
		await assertProposalAuthorization(proposalId, req);
		const proposal = await loadProposal(proposalId);
		res.status(200).contentType('application/json').send(proposal);
	})().catch((error: unknown) => {
		if (isTinyPgErrorWithQueryContext(error)) {
			next(new DatabaseError('Error loading the proposal.', error));
			return;
		}
		next(error);
	});
};

const getProposalByExternalId = (
	req: AuthenticatedRequest,
	res: Response,
	next: NextFunction,
): void => {
	if (!isAuthContext(req)) {
		next(new FailedMiddlewareError('Unexpected lack of auth context.'));
		return;
	}
	const { externalId } = req.params;
	if (!isProposalExternalId(externalId)) {
		next(new InputValidationError('Invalid external id parameter.', isProposalExternalId.errors ?? []));
		return;
	}
	(async () => {
		await assertProposalAuthorization(externalId, req);
		const proposal = await loadProposal(externalId);
		res.status(200).contentType('application/json').send(proposal);
	})().catch((error: unknown) => {
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
	if (!isAuthContext(req)) {
		next(new FailedMiddlewareError('Unexpected lack of auth context.'));
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
