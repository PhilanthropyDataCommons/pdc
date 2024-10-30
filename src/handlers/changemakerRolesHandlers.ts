import {
	getLimitValues,
	createOrUpdateChangemakerRole,
	loadChangemakerRole,
} from '../database';
import {
	isId,
	isTinyPgErrorWithQueryContext,
	isAuthContext,
	isWritableChangemakerRole,
	isKeycloakUserId,
} from '../types';
import { DatabaseError, FailedMiddlewareError, InputValidationError } from '../errors';
import {
	extractPaginationParameters,
	extractProposalParameters,
} from '../queryParameters';
import type { Request, Response, NextFunction } from 'express';
import { isAccessType } from '../types/AccessType';

const putChangemakerRole = (
	req: Request,
	res: Response,
	next: NextFunction,
): void => {
	if (!isAuthContext(req)) {
		next(new FailedMiddlewareError('Unexpected lack of auth context.'));
		return;
	}
	if (!isWritableChangemakerRole(req.body)) {
		next(
			new InputValidationError(
				'Invalid request body.',
				isWritableChangemakerRole.errors ?? [],
			),
		);
		return;
	}
	const createdBy = req.user.keycloakUserId;
	const changemakerId = req.params.changemakerId;
	const userKeycloakUserId = req.params.keycloakUserId;
	const accessType = req.params.accessType;
	if (!isId(changemakerId)) {
		next(
			new InputValidationError('Invalid id.', isId.errors ?? []),
		);
		return;
	}
	if (!isKeycloakUserId(userKeycloakUserId)) {
		next(
			new InputValidationError('Invalid Keycloak user id.', isKeycloakUserId.errors ?? []),
		);
		return;
	}
	if (!isAccessType(accessType)) {
		next(
			new InputValidationError('Invalid access type.', isAccessType.errors ?? []),
		);
		return;
	}
	createOrUpdateChangemakerRole({
		...req.body,
		changemakerId,
		userKeycloakUserId,
		accessType,
		createdBy,
	})
		.then((changemakerRole) => {
			res.status(201).contentType('application/json').send(changemakerRole);
		})
		.catch((error: unknown) => {
			if (isTinyPgErrorWithQueryContext(error)) {
				next(new DatabaseError('Error creating item.', error));
				return;
			}
			next(error);
		});
};

const getChangemakerRole = (
	req: Request,
	res: Response,
	next: NextFunction,
): void => {
	const changemakerId = req.params.changemakerId;
	const userKeycloakUserId = req.params.keycloakUserId;
	const accessType = req.params.accessType;
	if (!isId(changemakerId)) {
		next(new InputValidationError('Invalid id.', isId.errors ?? []));
		return;
	}
	if (!isKeycloakUserId(userKeycloakUserId)) {
		next(
			new InputValidationError('Invalid Keycloak user id.', isKeycloakUserId.errors ?? []),
		);
		return;
	}
	if (!isAccessType(accessType)) {
		next(
			new InputValidationError('Invalid access type.', isAccessType.errors ?? []),
		);
		return;
	}
	const authContext = isAuthContext(req) ? req : undefined;

	loadChangemakerRole(authContext, changemakerId, userKeycloakUserId, accessType)
		.then((changemaker) => {
			res.status(200).contentType('application/json').send(changemaker);
		})
		.catch((error: unknown) => {
			if (isTinyPgErrorWithQueryContext(error)) {
				next(new DatabaseError('Error retrieving item.', error));
				return;
			}
			next(error);
		});
};

const getChangemakerRoles = (
	req: Request,
	res: Response,
	next: NextFunction,
): void => {
	const paginationParameters = extractPaginationParameters(req);
	const { limit, offset } = getLimitValues(paginationParameters);
	const authContext = isAuthContext(req) ? req : undefined;
	loadChangemakerRoleBundle(authContext, proposalId, limit, offset)
		.then((changemakerBundle) => {
			res.status(200).contentType('application/json').send(changemakerBundle);
		})
		.catch((error: unknown) => {
			if (isTinyPgErrorWithQueryContext(error)) {
				next(new DatabaseError('Error retrieving changemakers.', error));
				return;
			}
			next(error);
		});
};


export const changemakersHandlers = {
	getChangemakerRole,
	getChangemakerRoles,
	putChangemakerRole,
};
