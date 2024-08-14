import nock from 'nock';
import { requireEnv } from 'require-env-variable';
import {
	createBaseField,
	loadBulkUpload,
	loadProposalBundle,
	loadApplicationFormBundle,
	createBulkUpload,
	loadSystemUser,
	loadOrganizationBundle,
	loadOrganizationProposalBundle,
	loadOpportunityBundle,
} from '../../database';
import { s3Client } from '../../s3Client';
import { getMockJobHelpers } from '../../test/mockGraphileWorker';
import { processBulkUpload } from '../processBulkUpload';
import {
	BaseFieldDataType,
	BaseFieldScope,
	BulkUploadStatus,
	Proposal,
} from '../../types';
import { expectTimestamp } from '../../test/utils';
import type {
	BulkUpload,
	InternallyWritableBulkUpload,
	Organization,
} from '../../types';

const { S3_BUCKET, S3_PATH_STYLE } = requireEnv('S3_BUCKET', 'S3_PATH_STYLE');

const TEST_UNPROCESSED_SOURCE_KEY =
	'unprocessed/550e8400-e29b-41d4-a716-446655440000';
const TEST_BULK_UPLOAD_SOURCE_KEY = 'bulk-upload/1';

const getS3Endpoint = async () => {
	if (s3Client.config.endpoint === undefined) {
		throw new Error('The S3 client is not configured with an endpoint');
	}
	const { hostname, protocol } = await s3Client.config.endpoint();
	return S3_PATH_STYLE === 'true'
		? `${protocol}//${hostname}`
		: `${protocol}//${S3_BUCKET}.${hostname}`;
};

const getS3Path = () => (S3_PATH_STYLE === 'true' ? `/${S3_BUCKET}` : '');

const getS3KeyPath = (key: string) => `${getS3Path()}/${key}`;

const createTestBulkUpload = async (
	overrideValues?: Partial<InternallyWritableBulkUpload>,
): Promise<BulkUpload> => {
	const systemUser = await loadSystemUser();
	const defaultValues = {
		fileName: 'bar.csv',
		sourceKey: TEST_UNPROCESSED_SOURCE_KEY,
		status: BulkUploadStatus.PENDING,
		createdBy: systemUser.id,
	};
	return createBulkUpload({
		...defaultValues,
		...overrideValues,
	});
};

const createTestBaseFields = async (): Promise<void> => {
	await createBaseField({
		defaultLabel: 'Proposal Submitter Email',
		defaultDescription:
			'The email address of the person who submitted the proposal.',
		shortCode: 'proposal_submitter_email',
		dataType: BaseFieldDataType.STRING,
		scope: BaseFieldScope.PROPOSAL,
	});
	await createBaseField({
		defaultLabel: 'Organization Name',
		defaultDescription: 'The name of the applying organization.',
		shortCode: 'organization_name',
		dataType: BaseFieldDataType.STRING,
		scope: BaseFieldScope.ORGANIZATION,
	});
	await createBaseField({
		defaultLabel: 'Organization EIN',
		defaultDescription: 'The name of the applying organization.',
		shortCode: 'organization_tax_id',
		dataType: BaseFieldDataType.STRING,
		scope: BaseFieldScope.ORGANIZATION,
	});
};

const mockS3GetObjectReplyWithFile = async (
	sourceKey: string,
	filePath: string,
) =>
	nock(await getS3Endpoint())
		.get(getS3KeyPath(sourceKey))
		.query({ 'x-id': 'GetObject' })
		.replyWithFile(200, filePath);

const mockS3CopyObjectReply = async (sourceKey: string) =>
	nock(await getS3Endpoint())
		.put(getS3KeyPath(`${sourceKey}`))
		.query({ 'x-id': 'CopyObject' })
		.reply(
			200,
			'<?xml version="1.0" encoding="UTF-8"?><CopyObjectResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><LastModified>2024-01-02T19:24:50.814Z</LastModified><ETag>745905cba4f8bfd2394f34e61d035a36</ETag></CopyObjectResult>',
		);

const mockS3DeleteObjectReply = async (sourceKey: string) =>
	nock(await getS3Endpoint())
		.delete(getS3KeyPath(`${sourceKey}`))
		.query({ 'x-id': 'DeleteObject' })
		.reply(204);

const mockS3ResponsesForBulkUploadProcessing = async (
	bulkUpload: BulkUpload,
	bulkUploadFilePath: string,
) => {
	const getRequest = await mockS3GetObjectReplyWithFile(
		bulkUpload.sourceKey,
		bulkUploadFilePath,
	);
	const copyRequest = await mockS3CopyObjectReply(
		`bulk-uploads/${bulkUpload.id}`,
	);
	const deleteRequest = await mockS3DeleteObjectReply(bulkUpload.sourceKey);
	return {
		getRequest,
		copyRequest,
		deleteRequest,
	};
};

describe('processBulkUpload', () => {
	it('should attempt to access the contents of the sourceKey associated with the specified bulk upload', async () => {
		const sourceKey = TEST_UNPROCESSED_SOURCE_KEY;
		const bulkUpload = await createTestBulkUpload({ sourceKey });
		const requests = await mockS3ResponsesForBulkUploadProcessing(
			bulkUpload,
			`${__dirname}/fixtures/processBulkUpload/validCsvTemplate.csv`,
		);
		await processBulkUpload(
			{
				bulkUploadId: bulkUpload.id,
			},
			getMockJobHelpers(),
		);
		expect(requests.getRequest.isDone()).toEqual(true);
	});

	it('should attempt to copy the contents of the sourceKey associated with the specified bulk upload to a processed location', async () => {
		await createTestBaseFields();
		const sourceKey = TEST_UNPROCESSED_SOURCE_KEY;
		const bulkUpload = await createTestBulkUpload({ sourceKey });
		const requests = await mockS3ResponsesForBulkUploadProcessing(
			bulkUpload,
			`${__dirname}/fixtures/processBulkUpload/validCsvTemplate.csv`,
		);
		await processBulkUpload(
			{
				bulkUploadId: bulkUpload.id,
			},
			getMockJobHelpers(),
		);
		expect(requests.copyRequest.isDone()).toEqual(true);
	});

	it('should attempt to delete the unprocessed file of the sourceKey associated with the specified bulk upload', async () => {
		await createTestBaseFields();
		const sourceKey = TEST_UNPROCESSED_SOURCE_KEY;
		const bulkUpload = await createTestBulkUpload({ sourceKey });
		const requests = await mockS3ResponsesForBulkUploadProcessing(
			bulkUpload,
			`${__dirname}/fixtures/processBulkUpload/validCsvTemplate.csv`,
		);
		await processBulkUpload(
			{
				bulkUploadId: bulkUpload.id,
			},
			getMockJobHelpers(),
		);
		expect(requests.deleteRequest.isDone()).toEqual(true);
	});

	it('should fail if the sourceKey is not accessible', async () => {
		const sourceKey = TEST_UNPROCESSED_SOURCE_KEY;
		const bulkUpload = await createTestBulkUpload({ sourceKey });
		const sourceRequest = nock(await getS3Endpoint())
			.get(getS3KeyPath(sourceKey))
			.query({ 'x-id': 'GetObject' })
			.reply(404);

		await processBulkUpload(
			{ bulkUploadId: bulkUpload.id },
			getMockJobHelpers(),
		);

		const updatedBulkUpload = await loadBulkUpload(bulkUpload.id);
		expect(updatedBulkUpload).toMatchObject({
			status: BulkUploadStatus.FAILED,
			fileSize: null,
		});
		expect(sourceRequest.isDone()).toEqual(true);
	});

	it('should not process, and fail, if the sourceKey is not in the unprocessed namespace', async () => {
		const sourceKey = TEST_BULK_UPLOAD_SOURCE_KEY;
		const bulkUpload = await createTestBulkUpload({ sourceKey });
		const requests = await mockS3ResponsesForBulkUploadProcessing(
			bulkUpload,
			`${__dirname}/fixtures/processBulkUpload/validCsvTemplate.csv`,
		);

		await processBulkUpload(
			{ bulkUploadId: bulkUpload.id },
			getMockJobHelpers(),
		);

		const updatedBulkUpload = await loadBulkUpload(bulkUpload.id);
		expect(updatedBulkUpload).toMatchObject({
			status: BulkUploadStatus.FAILED,
			fileSize: null,
		});
		expect(requests.getRequest.isDone()).toEqual(false);
	});

	it('should not process or modify processing status if the bulk upload is not PENDING', async () => {
		const sourceKey = TEST_UNPROCESSED_SOURCE_KEY;
		const bulkUpload = await createTestBulkUpload({
			sourceKey,
			status: BulkUploadStatus.IN_PROGRESS,
		});
		const requests = await mockS3ResponsesForBulkUploadProcessing(
			bulkUpload,
			`${__dirname}/fixtures/processBulkUpload/validCsvTemplate.csv`,
		);

		await processBulkUpload(
			{ bulkUploadId: bulkUpload.id },
			getMockJobHelpers(),
		);

		const updatedBulkUpload = await loadBulkUpload(bulkUpload.id);
		expect(updatedBulkUpload.status).toEqual(BulkUploadStatus.IN_PROGRESS);
		expect(requests.getRequest.isDone()).toEqual(false);
	});

	it('should fail if the csv contains an invalid short code', async () => {
		await createTestBaseFields();
		const sourceKey = TEST_UNPROCESSED_SOURCE_KEY;
		const bulkUpload = await createTestBulkUpload({ sourceKey });
		await mockS3ResponsesForBulkUploadProcessing(
			bulkUpload,
			`${__dirname}/fixtures/processBulkUpload/invalidShortCode.csv`,
		);
		await processBulkUpload(
			{
				bulkUploadId: bulkUpload.id,
			},
			getMockJobHelpers(),
		);
		const updatedBulkUpload = await loadBulkUpload(bulkUpload.id);
		expect(updatedBulkUpload).toMatchObject({
			status: BulkUploadStatus.FAILED,
			fileSize: 97,
		});
	});

	it('should move the csv file to processed location if the csv contains an invalid short code', async () => {
		await createTestBaseFields();
		const sourceKey = TEST_UNPROCESSED_SOURCE_KEY;
		const bulkUpload = await createTestBulkUpload({ sourceKey });
		const requests = await mockS3ResponsesForBulkUploadProcessing(
			bulkUpload,
			`${__dirname}/fixtures/processBulkUpload/invalidShortCode.csv`,
		);
		await processBulkUpload(
			{
				bulkUploadId: bulkUpload.id,
			},
			getMockJobHelpers(),
		);
		expect(requests.copyRequest.isDone()).toEqual(true);
		expect(requests.deleteRequest.isDone()).toEqual(true);
	});

	it('should have a proper failed state if the csv is empty', async () => {
		await createTestBaseFields();
		const sourceKey = TEST_UNPROCESSED_SOURCE_KEY;
		const bulkUpload = await createTestBulkUpload({ sourceKey });
		await mockS3ResponsesForBulkUploadProcessing(
			bulkUpload,
			`${__dirname}/fixtures/processBulkUpload/empty.csv`,
		);

		await processBulkUpload(
			{
				bulkUploadId: bulkUpload.id,
			},
			getMockJobHelpers(),
		);
		const updatedBulkUpload = await loadBulkUpload(bulkUpload.id);
		expect(updatedBulkUpload).toMatchObject({
			status: BulkUploadStatus.FAILED,
			fileSize: 0,
		});
	});

	it('should update the file size for the bulk upload if the sourceKey is accessible and contains a valid CSV', async () => {
		await createTestBaseFields();
		const sourceKey = TEST_UNPROCESSED_SOURCE_KEY;
		const bulkUpload = await createTestBulkUpload({ sourceKey });
		await mockS3ResponsesForBulkUploadProcessing(
			bulkUpload,
			`${__dirname}/fixtures/processBulkUpload/validCsvTemplate.csv`,
		);
		expect(bulkUpload.fileSize).toBe(null);

		await processBulkUpload(
			{
				bulkUploadId: bulkUpload.id,
			},
			getMockJobHelpers(),
		);
		const updatedBulkUpload = await loadBulkUpload(bulkUpload.id);
		expect(updatedBulkUpload).toMatchObject({
			fileSize: 93,
		});
	});

	it('should download, process, and resolve the bulk upload if the sourceKey is accessible and contains a valid CSV bulk upload', async () => {
		await createTestBaseFields();
		const sourceKey = TEST_UNPROCESSED_SOURCE_KEY;
		const bulkUpload = await createTestBulkUpload({ sourceKey });
		const requests = await mockS3ResponsesForBulkUploadProcessing(
			bulkUpload,
			`${__dirname}/fixtures/processBulkUpload/validCsvTemplate.csv`,
		);

		await processBulkUpload(
			{
				bulkUploadId: bulkUpload.id,
			},
			getMockJobHelpers(),
		);
		const updatedBulkUpload = await loadBulkUpload(bulkUpload.id);

		const {
			entries: [opportunity],
		} = await loadOpportunityBundle();
		if (opportunity === undefined) {
			throw new Error('The opportunity was not created');
		}

		const {
			entries: [applicationForm],
		} = await loadApplicationFormBundle();
		if (applicationForm === undefined) {
			fail('The application form was not created');
		}
		expect(applicationForm).toMatchObject({
			opportunityId: opportunity.id,
			version: 1,
			createdAt: expectTimestamp,
		});

		const proposalBundle = await loadProposalBundle({
			limit: 100,
			offset: 0,
		});
		expect(proposalBundle).toEqual({
			entries: [
				{
					createdAt: expectTimestamp,
					createdBy: 1,
					externalId: '2',
					id: 2,
					opportunityId: 1,
					versions: [
						{
							applicationFormId: 1,
							createdAt: expectTimestamp,
							fieldValues: [
								{
									applicationFormField: {
										applicationFormId: 1,
										baseField: {
											createdAt: expectTimestamp,
											dataType: 'string',
											defaultDescription:
												'The email address of the person who submitted the proposal.',
											id: 1,
											defaultLabel: 'Proposal Submitter Email',
											scope: 'proposal',
											shortCode: 'proposal_submitter_email',
											localizations: {},
										},
										baseFieldId: 1,
										createdAt: expectTimestamp,
										id: expect.any(Number) as number,
										label: 'Proposal Submitter Email',
										position: 0,
									},
									applicationFormFieldId: expect.any(Number) as number,
									createdAt: expectTimestamp,
									id: expect.any(Number) as number,
									isValid: true,
									position: 0,
									proposalVersionId: 2,
									value: 'foo@example.com',
								},
								{
									applicationFormField: {
										applicationFormId: 1,
										baseField: {
											createdAt: expectTimestamp,
											dataType: 'string',
											defaultDescription:
												'The name of the applying organization.',
											id: 2,
											defaultLabel: 'Organization Name',
											scope: 'organization',
											shortCode: 'organization_name',
											localizations: {},
										},
										baseFieldId: 2,
										createdAt: expectTimestamp,
										id: expect.any(Number) as number,
										label: 'Organization Name',
										position: 1,
									},
									applicationFormFieldId: expect.any(Number) as number,
									createdAt: expectTimestamp,
									id: expect.any(Number) as number,
									isValid: true,
									position: 1,
									proposalVersionId: 2,
									value: 'Bar Inc.',
								},
							],
							id: 2,
							proposalId: 2,
							version: 1,
						},
					],
				},
				{
					createdAt: expectTimestamp,
					createdBy: 1,
					externalId: '1',
					id: 1,
					opportunityId: 1,
					versions: [
						{
							applicationFormId: 1,
							createdAt: expectTimestamp,
							fieldValues: [
								{
									applicationFormField: {
										applicationFormId: 1,
										baseField: {
											createdAt: expectTimestamp,
											dataType: 'string',
											defaultDescription:
												'The email address of the person who submitted the proposal.',
											id: 1,
											defaultLabel: 'Proposal Submitter Email',
											scope: 'proposal',
											shortCode: 'proposal_submitter_email',
											localizations: {},
										},
										baseFieldId: 1,
										createdAt: expectTimestamp,
										id: expect.any(Number) as number,
										label: 'Proposal Submitter Email',
										position: 0,
									},
									applicationFormFieldId: expect.any(Number) as number,
									createdAt: expectTimestamp,
									id: expect.any(Number) as number,
									isValid: true,
									position: 0,
									proposalVersionId: 1,
									value: 'foo@example.com',
								},
								{
									applicationFormField: {
										applicationFormId: 1,
										baseField: {
											createdAt: expectTimestamp,
											dataType: 'string',
											defaultDescription:
												'The name of the applying organization.',
											id: 2,
											defaultLabel: 'Organization Name',
											scope: 'organization',
											shortCode: 'organization_name',
											localizations: {},
										},
										baseFieldId: 2,
										createdAt: expectTimestamp,
										id: expect.any(Number) as number,
										label: 'Organization Name',
										position: 1,
									},
									applicationFormFieldId: expect.any(Number) as number,
									createdAt: expectTimestamp,
									id: expect.any(Number) as number,
									isValid: true,
									position: 1,
									proposalVersionId: 1,
									value: 'Foo LLC.',
								},
							],
							id: 1,
							proposalId: 1,
							version: 1,
						},
					],
				},
			],
			total: 2,
		});

		const organizationBundle = await loadOrganizationBundle({
			limit: 100,
			offset: 0,
		});
		expect(organizationBundle).toEqual({
			entries: [],
			total: 0,
		});

		const organizationProposalBundle = await loadOrganizationProposalBundle({
			limit: 100,
			offset: 0,
		});
		expect(organizationProposalBundle).toEqual({
			entries: [],
			total: 0,
		});

		expect(updatedBulkUpload.status).toEqual(BulkUploadStatus.COMPLETED);
		expect(requests.getRequest.isDone()).toEqual(true);
		expect(requests.copyRequest.isDone()).toEqual(true);
		expect(requests.deleteRequest.isDone()).toEqual(true);
	});

	it('should create organizations and organization-proposal relationships', async () => {
		await createTestBaseFields();
		const sourceKey = TEST_UNPROCESSED_SOURCE_KEY;
		const bulkUpload = await createTestBulkUpload({ sourceKey });
		await mockS3ResponsesForBulkUploadProcessing(
			bulkUpload,
			`${__dirname}/fixtures/processBulkUpload/validCsvTemplateWithOrganizations.csv`,
		);

		await processBulkUpload(
			{
				bulkUploadId: bulkUpload.id,
			},
			getMockJobHelpers(),
		);

		const organizationBundle = await loadOrganizationBundle({
			limit: 100,
			offset: 0,
		});

		const organizationProposalBundle = await loadOrganizationProposalBundle({
			limit: 100,
			offset: 0,
		});

		expect(organizationBundle).toEqual({
			entries: [
				{
					createdAt: expectTimestamp,
					taxId: '51-2144346',
					id: 1,
					name: 'Foo LLC.',
				},
			],
			total: 1,
		});
		expect(organizationProposalBundle).toEqual({
			entries: [
				{
					createdAt: expectTimestamp,
					id: 2,
					organizationId: 1,
					proposalId: 2,
					organization: expect.any(Object) as Organization,
					proposal: expect.any(Object) as Proposal,
				},
				{
					createdAt: expectTimestamp,
					id: 1,
					organizationId: 1,
					proposalId: 1,
					organization: expect.any(Object) as Organization,
					proposal: expect.any(Object) as Proposal,
				},
			],
			total: 2,
		});
	});
});
