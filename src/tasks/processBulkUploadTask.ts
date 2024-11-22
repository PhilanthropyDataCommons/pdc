import fs from 'fs';
import { finished } from 'stream/promises';
import { parse } from 'csv-parse';
import { requireEnv } from 'require-env-variable';
import tmp from 'tmp-promise';
import {
	s3Client,
	S3_BULK_UPLOADS_KEY_PREFIX,
	S3_UNPROCESSED_KEY_PREFIX,
} from '../s3Client';
import {
	createApplicationForm,
	createApplicationFormField,
	createOpportunity,
	createChangemaker,
	createChangemakerProposal,
	createProposal,
	createProposalFieldValue,
	createProposalVersion,
	loadBaseFields,
	loadBulkUploadTask,
	loadChangemakerByTaxId,
	updateBulkUploadTask,
} from '../database/operations';
import { TaskStatus, isProcessBulkUploadJobPayload } from '../types';
import { fieldValueIsValid } from '../fieldValidation';
import type { Readable } from 'stream';
import type { GetObjectCommandOutput } from '@aws-sdk/client-s3';
import type { JobHelpers, Logger } from 'graphile-worker';
import type { FileResult } from 'tmp-promise';
import type {
	ApplicationFormField,
	BulkUploadTask,
	Opportunity,
	Changemaker,
	ProposalFieldValue,
	WritableChangemaker,
} from '../types';

const { S3_BUCKET } = requireEnv('S3_BUCKET');
const CHANGEMAKER_TAX_ID_SHORT_CODE = 'organization_tax_id';
const CHANGEMAKER_NAME_SHORT_CODE = 'organization_name';

const downloadS3ObjectToTemporaryStorage = async (
	key: string,
	logger: Logger,
): Promise<FileResult> => {
	let temporaryFile: FileResult;
	try {
		temporaryFile = await tmp.file();
	} catch (err) {
		throw new Error('Unable to create a temporary file');
	}
	const writeStream = fs.createWriteStream(temporaryFile.path, {
		autoClose: true,
	});

	let s3Response: GetObjectCommandOutput;
	try {
		s3Response = await s3Client.getObject({
			Key: key,
			Bucket: S3_BUCKET,
		});
		if (s3Response.Body === undefined) {
			throw new Error('S3 did not return a body');
		}
	} catch (err) {
		logger.error('Failed to load an object from S3', { err, key });
		await temporaryFile.cleanup();
		throw new Error('Unable to load the s3 object');
	}

	const s3Body = s3Response.Body as Readable;
	try {
		await finished(s3Body.pipe(writeStream));
	} catch (err) {
		await temporaryFile.cleanup();
		throw err;
	}

	return temporaryFile;
};

const loadShortCodesFromBulkUploadTaskCsv = async (
	csvPath: string,
): Promise<string[]> => {
	let shortCodes: string[] = [];
	let hasLoadedShortCodes = false;
	const parser = fs.createReadStream(csvPath).pipe(
		// Loading the entire CSV is a waste, but the `to` option is currently broken
		// See https://github.com/adaltas/node-csv/issues/410
		parse(),
	);
	await parser.forEach(async (record: string[]) => {
		if (!hasLoadedShortCodes) {
			shortCodes = record;
			hasLoadedShortCodes = true;
		}
	});
	return shortCodes ?? [];
};

const assertShortCodesReferToExistingBaseFields = async (
	shortCodes: string[],
): Promise<void> => {
	const baseFields = await loadBaseFields();
	shortCodes.forEach((shortCode) => {
		const baseField = baseFields.find(
			(baseFieldCandidate) => baseFieldCandidate.shortCode === shortCode,
		);
		if (baseField === undefined) {
			throw new Error(`${shortCode} is not a valid BaseField short code.`);
		}
	});
};

const assertShortCodesAreValid = async (
	shortCodes: string[],
): Promise<void> => {
	await assertShortCodesReferToExistingBaseFields(shortCodes);
};

const assertCsvContainsValidShortCodes = async (
	csvPath: string,
): Promise<void> => {
	const shortCodes = await loadShortCodesFromBulkUploadTaskCsv(csvPath);
	if (shortCodes.length === 0) {
		throw new Error('No short codes detected in the first row of the CSV');
	}
	await assertShortCodesAreValid(shortCodes);
};

const assertCsvContainsRowsOfEqualLength = async (
	csvPath: string,
): Promise<void> => {
	const csvReadStream = fs.createReadStream(csvPath);
	const parser = parse();
	parser.on('readable', () => {
		while (parser.read() !== null) {
			// Iterate through the data -- an error will be thrown if
			// any columns have a different number of fields
			// see https://csv.js.org/parse/options/relax_column_count/
		}
	});
	csvReadStream.pipe(parser);
	await finished(parser);
};

const assertBulkUploadTaskCsvIsValid = async (
	csvPath: string,
): Promise<void> => {
	await assertCsvContainsValidShortCodes(csvPath);
	await assertCsvContainsRowsOfEqualLength(csvPath);
};

const createOpportunityForBulkUploadTask = async (
	bulkUploadTask: BulkUploadTask,
): Promise<Opportunity> =>
	createOpportunity({
		title: `Bulk Upload (${bulkUploadTask.createdAt})`,
	});

const createApplicationFormFieldsForBulkUploadTask = async (
	csvPath: string,
	applicationFormId: number,
): Promise<ApplicationFormField[]> => {
	const shortCodes = await loadShortCodesFromBulkUploadTaskCsv(csvPath);
	const baseFields = await loadBaseFields();
	const applicationFormFields = await Promise.all(
		shortCodes.map(async (shortCode, index) => {
			const baseField = baseFields.find(
				(candidateBaseField) => candidateBaseField.shortCode === shortCode,
			);
			if (baseField === undefined) {
				throw new Error(
					`No base field could be found with shortCode "${shortCode}"`,
				);
			}
			const applicationFormField = await createApplicationFormField({
				applicationFormId,
				baseFieldId: baseField.id,
				position: index,
				label: baseField.label,
			});
			return applicationFormField;
		}),
	);
	return applicationFormFields;
};

const getProcessedKey = (bulkUploadTask: BulkUploadTask): string =>
	`${S3_BULK_UPLOADS_KEY_PREFIX}/${bulkUploadTask.id}`;

const getChangemakerTaxIdIndex = (columns: string[]): number =>
	columns.indexOf(CHANGEMAKER_TAX_ID_SHORT_CODE);

const getChangemakerNameIndex = (columns: string[]): number =>
	columns.indexOf(CHANGEMAKER_NAME_SHORT_CODE);

const createOrLoadChangemaker = async (
	writeValues: Omit<WritableChangemaker, 'name'> & { name?: string },
): Promise<Changemaker | undefined> => {
	try {
		return await loadChangemakerByTaxId(writeValues.taxId);
	} catch {
		if (writeValues.name !== undefined) {
			return createChangemaker({
				...writeValues,
				name: writeValues.name, // This looks silly, but TypeScript isn't guarding `writeValues`, just `writeValues.name`.
			});
		}
	}
	return undefined;
};

export const processBulkUploadTask = async (
	payload: unknown,
	helpers: JobHelpers,
): Promise<void> => {
	if (!isProcessBulkUploadJobPayload(payload)) {
		helpers.logger.error('Malformed bulk upload job payload', {
			errors: isProcessBulkUploadJobPayload.errors ?? [],
		});
		return;
	}
	helpers.logger.debug(
		`Started processBulkUpload Job for Bulk Upload ID ${payload.bulkUploadId}`,
	);
	const bulkUploadTask = await loadBulkUploadTask(payload.bulkUploadId);
	if (bulkUploadTask.status !== TaskStatus.PENDING) {
		helpers.logger.warn(
			'Bulk upload cannot be processed because it is not in a PENDING state',
			{ bulkUploadTask },
		);
		return;
	}
	if (!bulkUploadTask.sourceKey.startsWith(S3_UNPROCESSED_KEY_PREFIX)) {
		helpers.logger.info(
			`Bulk upload task cannot be processed because the associated sourceKey does not begin with ${S3_UNPROCESSED_KEY_PREFIX}`,
			{ bulkUploadTask },
		);
		await updateBulkUploadTask(bulkUploadTask.id, {
			status: TaskStatus.FAILED,
		});
		return;
	}

	let bulkUploadFile: FileResult;
	let bulkUploadHasFailed = false;
	try {
		await updateBulkUploadTask(bulkUploadTask.id, {
			status: TaskStatus.IN_PROGRESS,
		});
		bulkUploadFile = await downloadS3ObjectToTemporaryStorage(
			bulkUploadTask.sourceKey,
			helpers.logger,
		);
	} catch (err) {
		helpers.logger.warn('Download of bulk upload file from S3 failed', { err });
		await updateBulkUploadTask(bulkUploadTask.id, {
			status: TaskStatus.FAILED,
		});
		return;
	}

	const shortCodes = await loadShortCodesFromBulkUploadTaskCsv(
		bulkUploadFile.path,
	);
	const changemakerNameIndex = getChangemakerNameIndex(shortCodes);
	const changemakerTaxIdIndex = getChangemakerTaxIdIndex(shortCodes);

	try {
		await assertBulkUploadTaskCsvIsValid(bulkUploadFile.path);
		const opportunity =
			await createOpportunityForBulkUploadTask(bulkUploadTask);
		const applicationForm = await createApplicationForm({
			opportunityId: opportunity.id,
		});

		const applicationFormFields =
			await createApplicationFormFieldsForBulkUploadTask(
				bulkUploadFile.path,
				applicationForm.id,
			);
		const csvReadStream = fs.createReadStream(bulkUploadFile.path);
		const parser = parse({
			from: 2,
		});
		csvReadStream.pipe(parser);
		let recordNumber = 0;
		await parser.forEach(async (record: string[]) => {
			recordNumber += 1;
			const proposal = await createProposal({
				opportunityId: opportunity.id,
				externalId: `${recordNumber}`,
				createdBy: bulkUploadTask.createdBy,
			});
			const proposalVersion = await createProposalVersion({
				proposalId: proposal.id,
				applicationFormId: applicationForm.id,
				sourceId: bulkUploadTask.sourceId,
				createdBy: bulkUploadTask.createdBy,
			});

			const changemakerName = record[changemakerNameIndex];
			const changemakerTaxId = record[changemakerTaxIdIndex];
			if (changemakerTaxId !== undefined) {
				const changemaker = await createOrLoadChangemaker({
					name: changemakerName,
					taxId: changemakerTaxId,
				});

				if (changemaker !== undefined) {
					await createChangemakerProposal({
						changemakerId: changemaker.id,
						proposalId: proposal.id,
					});
				}
			}

			await Promise.all(
				record.map<Promise<ProposalFieldValue>>(async (fieldValue, index) => {
					const applicationFormField = applicationFormFields[index];
					if (applicationFormField === undefined) {
						throw new Error(
							'There is no form field associated with this column',
						);
					}
					const isValid = fieldValueIsValid(
						fieldValue,
						applicationFormField.baseField.dataType,
					);
					return createProposalFieldValue({
						proposalVersionId: proposalVersion.id,
						applicationFormFieldId: applicationFormField.id,
						value: fieldValue,
						position: index,
						isValid,
					});
				}),
			);
		});
	} catch (err) {
		helpers.logger.info('Bulk upload has failed', { err });
		bulkUploadHasFailed = true;
	}

	try {
		const fileStats = await fs.promises.stat(bulkUploadFile.path);
		const fileSize = fileStats.size;
		await updateBulkUploadTask(bulkUploadTask.id, { fileSize });
	} catch (err) {
		helpers.logger.warn(
			`Unable to update the fileSize for bulkUploadTask ${bulkUploadTask.id}`,
			{ err },
		);
	}

	try {
		await bulkUploadFile.cleanup();
	} catch (err) {
		helpers.logger.warn(
			`Cleanup of a temporary file failed (${bulkUploadFile.path})`,
			{ err },
		);
	}

	try {
		const copySource = `${S3_BUCKET}/${bulkUploadTask.sourceKey}`;
		const copyDestination = getProcessedKey(bulkUploadTask);
		await s3Client.copyObject({
			Bucket: S3_BUCKET,
			CopySource: copySource,
			Key: copyDestination,
		});
		await s3Client.deleteObject({
			Bucket: S3_BUCKET,
			Key: bulkUploadTask.sourceKey,
		});
		await updateBulkUploadTask(bulkUploadTask.id, {
			sourceKey: copyDestination,
		});
	} catch (err) {
		helpers.logger.warn(
			`Moving the bulk upload task file to final processed destination failed (${bulkUploadFile.path})`,
			{ err },
		);
	}

	if (bulkUploadHasFailed) {
		await updateBulkUploadTask(bulkUploadTask.id, {
			status: TaskStatus.FAILED,
		});
	} else {
		await updateBulkUploadTask(bulkUploadTask.id, {
			status: TaskStatus.COMPLETED,
		});
	}
};