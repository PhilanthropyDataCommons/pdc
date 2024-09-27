import {
	assertSourceExists,
	createBulkUpload,
	getLimitValues,
	loadBulkUploadBundle,
} from '../database';
import {
	BulkUploadStatus,
	isAuthContext,
	isTinyPgErrorWithQueryContext,
	isWritableBulkUpload,
} from '../types';
import {
	DatabaseError,
	FailedMiddlewareError,
	InputConflictError,
	InputValidationError,
	NotFoundError,
} from '../errors';
import {
	extractCreatedByParameters,
	extractPaginationParameters,
} from '../queryParameters';
import { addProcessBulkUploadJob } from '../jobQueue';
import { S3_UNPROCESSED_KEY_PREFIX } from '../s3Client';
import type { Request, Response, NextFunction } from 'express';

const postBulkUpload = (
	req: Request,
	res: Response,
	next: NextFunction,
): void => {
	if (!isAuthContext(req)) {
		next(new FailedMiddlewareError('Unexpected lack of auth context.'));
		return;
	}
	if (!isWritableBulkUpload(req.body)) {
		next(
			new InputValidationError(
				'Invalid request body.',
				isWritableBulkUpload.errors ?? [],
			),
		);
		return;
	}

	const { sourceId, fileName, sourceKey } = req.body;
	const createdBy = req.user.id;

	if (!sourceKey.startsWith(`${S3_UNPROCESSED_KEY_PREFIX}/`)) {
		throw new InputValidationError(
			`sourceKey must be unprocessed, and begin with '${S3_UNPROCESSED_KEY_PREFIX}/'.`,
			[],
		);
	}

	assertSourceExists(sourceId)
		.then(async () => {
			const bulkUpload = await createBulkUpload({
				sourceId,
				fileName,
				sourceKey,
				status: BulkUploadStatus.PENDING,
				createdBy,
			});
			await addProcessBulkUploadJob({
				bulkUploadId: bulkUpload.id,
			});
			res.status(201).contentType('application/json').send(bulkUpload);
		})
		.catch((error: unknown) => {
			if (isTinyPgErrorWithQueryContext(error)) {
				next(new DatabaseError('Error creating bulk upload.', error));
				return;
			}
			if (error instanceof NotFoundError) {
				if (error.details.entityType === 'Source') {
					next(
						new InputConflictError(`The related entity does not exist`, {
							entityType: 'Source',
							entityId: sourceId,
						}),
					);
					return;
				}
			}
			next(error);
		});
};

const getBulkUploads = (
	req: Request,
	res: Response,
	next: NextFunction,
): void => {
	if (!isAuthContext(req)) {
		next(new FailedMiddlewareError('Unexpected lack of auth context.'));
		return;
	}
	const paginationParameters = extractPaginationParameters(req);
	const { offset, limit } = getLimitValues(paginationParameters);
	const { createdBy } = extractCreatedByParameters(req);
	(async () => {
		const bulkUploadBundle = await loadBulkUploadBundle(
			req,
			createdBy,
			limit,
			offset,
		);

		res.status(200).contentType('application/json').send(bulkUploadBundle);
	})().catch((error: unknown) => {
		if (isTinyPgErrorWithQueryContext(error)) {
			next(new DatabaseError('Error retrieving bulk uploads.', error));
			return;
		}
		next(error);
	});
};

export const bulkUploadsHandlers = {
	postBulkUpload,
	getBulkUploads,
};
