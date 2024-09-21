import { getLimitValues, loadUserBundle } from '../database';
import {
	AuthenticatedRequest,
	isAuthContext,
	isTinyPgErrorWithQueryContext,
} from '../types';
import { DatabaseError, FailedMiddlewareError } from '../errors';
import {
	extractAuthenticationIdParameters,
	extractPaginationParameters,
} from '../queryParameters';
import type { Response, NextFunction } from 'express';

const getUsers = (
	req: AuthenticatedRequest,
	res: Response,
	next: NextFunction,
): void => {
	if (!isAuthContext(req)) {
		next(new FailedMiddlewareError('Unexpected lack of auth context.'));
		return;
	}
	const paginationParameters = extractPaginationParameters(req);
	const { offset, limit } = getLimitValues(paginationParameters);
	const { authenticationId } = extractAuthenticationIdParameters(req);

	(async () => {
		const userBundle = await loadUserBundle(
			req,
			authenticationId,
			limit,
			offset,
		);

		res.status(200).contentType('application/json').send(userBundle);
	})().catch((error: unknown) => {
		if (isTinyPgErrorWithQueryContext(error)) {
			next(new DatabaseError('Error retrieving users.', error));
			return;
		}
		next(error);
	});
};

const usersHandlers = {
	getUsers,
};

export { usersHandlers };
