import request from 'supertest';
import { app } from '../app';
import {
	createApplicationFormField,
	createOrganization,
	createOrganizationProposal,
	createProposal,
	db,
	loadTableMetrics,
} from '../database';
import { expectTimestamp, loadTestUser } from '../test/utils';
import {
	mockJwt as authHeader,
	mockJwtWithoutSub as authHeaderWithNoSubj,
} from '../test/mockJwt';
import { PostgresErrorCode } from '../types/PostgresErrorCode';
import { createApplicationForm } from '../database/operations/create/createApplicationForm';
import { BaseFieldDataType } from '../types';

const agent = request.agent(app);

const createTestBaseFields = async () => {
	await db.sql('baseFields.insertOne', {
		label: 'Summary',
		description: 'A summary of the proposal',
		shortCode: 'summary',
		dataType: BaseFieldDataType.STRING,
	});
	await db.sql('baseFields.insertOne', {
		label: 'Title',
		description: 'The title of the proposal',
		shortCode: 'title',
		dataType: BaseFieldDataType.STRING,
	});
};

describe('/proposals', () => {
	describe('GET /', () => {
		it('requires authentication', async () => {
			await agent.get('/proposals').expect(401);
		});

		it('returns an empty Bundle when no data is present', async () => {
			const response = await agent
				.get('/proposals')
				.set(authHeader)
				.expect(200);
			expect(response.body).toEqual({
				total: 0,
				entries: [],
			});
		});

		it('returns proposals present in the database', async () => {
			await db.sql('opportunities.insertOne', {
				title: '🔥',
			});
			const testUser = await loadTestUser();
			await createTestBaseFields();
			await createProposal({
				externalId: 'proposal-1',
				opportunityId: 1,
				createdBy: testUser.id,
			});
			await createProposal({
				externalId: 'proposal-2',
				opportunityId: 1,
				createdBy: testUser.id,
			});
			await createApplicationForm({
				opportunityId: 1,
			});
			await db.sql('proposalVersions.insertOne', {
				proposalId: 1,
				applicationFormId: 1,
			});
			await createApplicationFormField({
				applicationFormId: 1,
				baseFieldId: 1,
				position: 1,
				label: 'Short summary',
			});
			await db.sql('proposalFieldValues.insertOne', {
				proposalVersionId: 1,
				applicationFormFieldId: 1,
				position: 1,
				value: 'This is a summary',
				isValid: true,
			});

			const response = await agent
				.get('/proposals')
				.set(authHeader)
				.expect(200);
			expect(response.body).toEqual({
				total: 2,
				entries: [
					{
						id: 2,
						externalId: 'proposal-2',
						opportunityId: 1,
						createdAt: expectTimestamp,
						createdBy: testUser.id,
						versions: [],
					},
					{
						id: 1,
						externalId: 'proposal-1',
						opportunityId: 1,
						createdAt: expectTimestamp,
						createdBy: testUser.id,
						versions: [
							{
								id: 1,
								proposalId: 1,
								version: 1,
								applicationFormId: 1,
								createdAt: expectTimestamp,
								fieldValues: [
									{
										id: 1,
										applicationFormFieldId: 1,
										proposalVersionId: 1,
										position: 1,
										value: 'This is a summary',
										isValid: true,
										createdAt: expectTimestamp,
										applicationFormField: {
											id: 1,
											applicationFormId: 1,
											baseFieldId: 1,
											baseField: {
												createdAt: expectTimestamp,
												dataType: 'string',
												description: 'A summary of the proposal',
												id: 1,
												label: 'Summary',
												shortCode: 'summary',
											},
											label: 'Short summary',
											position: 1,
											createdAt: expectTimestamp,
										},
									},
								],
							},
						],
					},
				],
			});
		});

		it('returns a subset of proposals present in the database when an organization filter is provided', async () => {
			await db.sql('opportunities.insertOne', {
				title: '🔥',
			});

			const testUser = await loadTestUser();
			await createTestBaseFields();
			const proposal = await createProposal({
				externalId: 'proposal-1',
				opportunityId: 1,
				createdBy: testUser.id,
			});
			await createProposal({
				externalId: 'proposal-2',
				opportunityId: 1,
				createdBy: testUser.id,
			});
			const organization = await createOrganization({
				employerIdentificationNumber: '123-123-123',
				name: 'Canadian Company',
			});
			await createOrganizationProposal({
				organizationId: organization.id,
				proposalId: proposal.id,
			});
			const response = await agent
				.get(`/proposals?organization=${organization.id}`)
				.set(authHeader)
				.expect(200);
			expect(response.body).toEqual({
				total: 2,
				entries: [
					{
						id: 1,
						externalId: 'proposal-1',
						opportunityId: 1,
						createdAt: expectTimestamp,
						createdBy: testUser.id,
						versions: [],
					},
				],
			});
		});

		it('returns a 400 error if an invalid organization filter is provided', async () => {
			const response = await agent
				.get(`/proposals?organization=foo`)
				.set(authHeader)
				.expect(400);
			expect(response.body).toMatchObject({
				name: 'InputValidationError',
				message: expect.any(String) as string,
			});
		});

		it('returns a subset of proposals present in the database when search is provided', async () => {
			await db.sql('opportunities.insertOne', {
				title: '🔥',
			});

			const testUser = await loadTestUser();
			await createTestBaseFields();
			await createProposal({
				externalId: 'proposal-1',
				opportunityId: 1,
				createdBy: testUser.id,
			});
			await createProposal({
				externalId: 'proposal-2',
				opportunityId: 1,
				createdBy: testUser.id,
			});
			await createApplicationForm({
				opportunityId: 1,
			});
			await db.sql('proposalVersions.insertOne', {
				proposalId: 1,
				applicationFormId: 1,
			});
			await db.sql('proposalVersions.insertOne', {
				proposalId: 2,
				applicationFormId: 1,
			});
			await createApplicationFormField({
				applicationFormId: 1,
				baseFieldId: 1,
				position: 1,
				label: 'Short summary',
			});
			await db.sql('proposalFieldValues.insertOne', {
				proposalVersionId: 1,
				applicationFormFieldId: 1,
				position: 1,
				value: 'This is a summary',
				isValid: true,
			});
			await db.sql('proposalFieldValues.insertOne', {
				proposalVersionId: 2,
				applicationFormFieldId: 1,
				position: 1,
				value: 'This is a pair of pants',
				isValid: true,
			});
			const response = await agent
				.get('/proposals?_content=summary')
				.set(authHeader)
				.expect(200);
			expect(response.body).toEqual({
				total: 2,
				entries: [
					{
						id: 1,
						externalId: 'proposal-1',
						opportunityId: 1,
						createdAt: expectTimestamp,
						createdBy: testUser.id,
						versions: [
							{
								id: 1,
								proposalId: 1,
								version: 1,
								applicationFormId: 1,
								createdAt: expectTimestamp,
								fieldValues: [
									{
										id: 1,
										applicationFormFieldId: 1,
										proposalVersionId: 1,
										position: 1,
										value: 'This is a summary',
										isValid: true,
										createdAt: expectTimestamp,
										applicationFormField: {
											id: 1,
											applicationFormId: 1,
											baseFieldId: 1,
											baseField: {
												createdAt: expectTimestamp,
												dataType: 'string',
												description: 'A summary of the proposal',
												id: 1,
												label: 'Summary',
												shortCode: 'summary',
											},
											label: 'Short summary',
											position: 1,
											createdAt: expectTimestamp,
										},
									},
								],
							},
						],
					},
				],
			});
		});

		it('returns a subset of proposals present in the database when search is provided - tscfg simple', async () => {
			// This should pass even if the default text search config is 'simple'.
			// See https://github.com/PhilanthropyDataCommons/service/issues/336
			await db.query("set default_text_search_config = 'simple';");
			await db.sql('opportunities.insertOne', {
				title: 'Grand opportunity',
			});
			const testUser = await loadTestUser();
			await createTestBaseFields();
			await createProposal({
				externalId: 'proposal-4999',
				opportunityId: 1,
				createdBy: testUser.id,
			});
			await createProposal({
				externalId: 'proposal-5003',
				opportunityId: 1,
				createdBy: testUser.id,
			});
			await createApplicationForm({
				opportunityId: 1,
			});
			await db.sql('proposalVersions.insertOne', {
				proposalId: 1,
				applicationFormId: 1,
			});
			await db.sql('proposalVersions.insertOne', {
				proposalId: 2,
				applicationFormId: 1,
			});
			await createApplicationFormField({
				applicationFormId: 1,
				baseFieldId: 1,
				position: 1,
				label: 'Concise summary',
			});
			await db.sql('proposalFieldValues.insertOne', {
				proposalVersionId: 1,
				applicationFormFieldId: 1,
				position: 1,
				value: 'This is a summary',
				isValid: true,
			});
			await db.sql('proposalFieldValues.insertOne', {
				proposalVersionId: 2,
				applicationFormFieldId: 1,
				position: 1,
				value: 'This is a pair of pants',
				isValid: true,
			});
			const response = await agent
				.get('/proposals?_content=summary')
				.set(authHeader)
				.expect(200);
			expect(response.body).toEqual({
				total: 2,
				entries: [
					{
						id: 1,
						externalId: 'proposal-4999',
						opportunityId: 1,
						createdAt: expectTimestamp,
						createdBy: testUser.id,
						versions: [
							{
								id: 1,
								proposalId: 1,
								version: 1,
								applicationFormId: 1,
								createdAt: expectTimestamp,
								fieldValues: [
									{
										id: 1,
										applicationFormFieldId: 1,
										proposalVersionId: 1,
										position: 1,
										value: 'This is a summary',
										isValid: true,
										createdAt: expectTimestamp,
										applicationFormField: {
											id: 1,
											applicationFormId: 1,
											baseFieldId: 1,
											baseField: {
												createdAt: expectTimestamp,
												dataType: 'string',
												description: 'A summary of the proposal',
												id: 1,
												label: 'Summary',
												shortCode: 'summary',
											},
											label: 'Concise summary',
											position: 1,
											createdAt: expectTimestamp,
										},
									},
								],
							},
						],
					},
				],
			});
		});

		it('returns according to pagination parameters', async () => {
			await db.sql('opportunities.insertOne', {
				title: '🔥',
			});

			const testUser = await loadTestUser();
			await Array.from(Array(20)).reduce(async (p, _, i) => {
				await p;
				await createProposal({
					externalId: `proposal-${i + 1}`,
					opportunityId: 1,
					createdBy: testUser.id,
				});
			}, Promise.resolve());
			const response = await agent
				.get('/proposals')
				.query({
					_page: 2,
					_count: 5,
				})
				.set(authHeader)
				.expect(200);
			expect(response.body).toEqual({
				total: 20,
				entries: [
					{
						id: 15,
						externalId: 'proposal-15',
						opportunityId: 1,
						versions: [],
						createdAt: expectTimestamp,
						createdBy: testUser.id,
					},
					{
						id: 14,
						externalId: 'proposal-14',
						opportunityId: 1,
						versions: [],
						createdAt: expectTimestamp,
						createdBy: testUser.id,
					},
					{
						id: 13,
						externalId: 'proposal-13',
						opportunityId: 1,
						versions: [],
						createdAt: expectTimestamp,
						createdBy: testUser.id,
					},
					{
						id: 12,
						externalId: 'proposal-12',
						opportunityId: 1,
						versions: [],
						createdAt: expectTimestamp,
						createdBy: testUser.id,
					},
					{
						id: 11,
						externalId: 'proposal-11',
						opportunityId: 1,
						versions: [],
						createdAt: expectTimestamp,
						createdBy: testUser.id,
					},
				],
			});
		});
	});

	describe('GET /:id', () => {
		it('requires authentication', async () => {
			await agent.get('/proposals/9001').expect(401);
		});

		it('returns 404 when given id is not present', async () => {
			const response = await agent
				.get('/proposals/9001')
				.set(authHeader)
				.expect(404);
			expect(response.body).toEqual({
				name: 'NotFoundError',
				message: expect.any(String) as string,
				details: [
					{
						name: 'NotFoundError',
					},
				],
			});
		});

		it('returns 400 when given id a string', async () => {
			const response = await agent
				.get('/proposals/foobar')
				.set(authHeader)
				.expect(400);
			expect(response.body).toEqual({
				name: 'InputValidationError',
				message: expect.any(String) as string,
				details: [],
			});
		});

		it('returns the one proposal asked for', async () => {
			await db.query(`
        INSERT INTO opportunities (
          title,
          created_at
        )
        VALUES
          ( '⛰️', '2525-01-03T00:00:01Z' )
      `);

			const testUser = await loadTestUser();
			await createProposal({
				externalId: `proposal-1`,
				opportunityId: 1,
				createdBy: testUser.id,
			});
			await createProposal({
				externalId: `proposal-2`,
				opportunityId: 1,
				createdBy: testUser.id,
			});

			const response = await agent
				.get('/proposals/2')
				.set(authHeader)
				.expect(200);
			expect(response.body).toEqual({
				id: 2,
				externalId: 'proposal-2',
				versions: [],
				opportunityId: 1,
				createdAt: expectTimestamp,
				createdBy: testUser.id,
			});
		});

		it('returns one proposal with deep fields', async () => {
			await createTestBaseFields();
			await db.query(`
        INSERT INTO opportunities (
          title,
          created_at
        )
        VALUES
          ( '🌎', '2525-01-04T00:00:01Z' )
      `);
			await db.query(`
        INSERT INTO application_forms (
          opportunity_id,
          version,
          created_at
        )
        VALUES
          ( 1, 1, '2525-01-04T00:00:04Z' )
      `);
			await db.query(`
        INSERT INTO application_form_fields (
          application_form_id,
          base_field_id,
          position,
          label,
          created_at
        )
        VALUES
          ( 1, 2, 1, 'Short summary or title', '2525-01-04T00:00:05Z' ),
          ( 1, 1, 2, 'Long summary or abstract', '2525-01-04T00:00:06Z' );
      `);
			const testUser = await loadTestUser();
			await createProposal({
				externalId: `proposal-2525-01-04T00Z`,
				opportunityId: 1,
				createdBy: testUser.id,
			});
			await db.query(`
        INSERT INTO proposal_versions (
          proposal_id,
          application_form_id,
          version,
          created_at
        )
        VALUES
          ( 1, 1, 1, '2525-01-04T00:00:08Z' ),
          ( 1, 1, 2, '2525-01-04T00:00:09Z' );
      `);
			await db.query(`
        INSERT INTO proposal_field_values (
          proposal_version_id,
          application_form_field_id,
          position,
          value,
					is_valid,
          created_at
        )
        VALUES
          ( 1, 1, 1, 'Title for version 1 from 2525-01-04', true, '2525-01-04T00:00:10Z' ),
          ( 1, 2, 2, 'Abstract for version 1 from 2525-01-04', true, '2525-01-04T00:00:11Z'),
          ( 2, 1, 1, 'Title for version 2 from 2525-01-04', true, '2525-01-04T00:00:12Z' ),
          ( 2, 2, 2, 'Abstract for version 2 from 2525-01-04', true, '2525-01-04T00:00:13Z' );
      `);
			const response = await agent
				.get('/proposals/1')
				.set(authHeader)
				.expect(200);
			expect(response.body).toEqual({
				id: 1,
				opportunityId: 1,
				externalId: 'proposal-2525-01-04T00Z',
				createdAt: expectTimestamp,
				createdBy: testUser.id,
				versions: [
					{
						id: 2,
						proposalId: 1,
						applicationFormId: 1,
						version: 2,
						createdAt: expectTimestamp,
						fieldValues: [
							{
								id: 3,
								proposalVersionId: 2,
								applicationFormFieldId: 1,
								position: 1,
								value: 'Title for version 2 from 2525-01-04',
								isValid: true,
								createdAt: expectTimestamp,
								applicationFormField: {
									id: 1,
									applicationFormId: 1,
									baseFieldId: 2,
									baseField: {
										createdAt: expectTimestamp,
										dataType: 'string',
										description: 'The title of the proposal',
										id: 2,
										label: 'Title',
										shortCode: 'title',
									},
									position: 1,
									label: 'Short summary or title',
									createdAt: expectTimestamp,
								},
							},
							{
								id: 4,
								proposalVersionId: 2,
								applicationFormFieldId: 2,
								position: 2,
								value: 'Abstract for version 2 from 2525-01-04',
								isValid: true,
								createdAt: expectTimestamp,
								applicationFormField: {
									id: 2,
									applicationFormId: 1,
									baseFieldId: 1,
									baseField: {
										createdAt: expectTimestamp,
										dataType: 'string',
										description: 'A summary of the proposal',
										id: 1,
										label: 'Summary',
										shortCode: 'summary',
									},
									position: 2,
									label: 'Long summary or abstract',
									createdAt: expectTimestamp,
								},
							},
						],
					},
					{
						id: 1,
						proposalId: 1,
						applicationFormId: 1,
						version: 1,
						createdAt: expectTimestamp,
						fieldValues: [
							{
								id: 1,
								proposalVersionId: 1,
								applicationFormFieldId: 1,
								position: 1,
								value: 'Title for version 1 from 2525-01-04',
								createdAt: expectTimestamp,
								isValid: true,
								applicationFormField: {
									id: 1,
									applicationFormId: 1,
									baseFieldId: 2,
									baseField: {
										createdAt: expectTimestamp,
										dataType: 'string',
										description: 'The title of the proposal',
										id: 2,
										label: 'Title',
										shortCode: 'title',
									},
									position: 1,
									label: 'Short summary or title',
									createdAt: expectTimestamp,
								},
							},
							{
								id: 2,
								proposalVersionId: 1,
								applicationFormFieldId: 2,
								position: 2,
								value: 'Abstract for version 1 from 2525-01-04',
								isValid: true,
								createdAt: expectTimestamp,
								applicationFormField: {
									id: 2,
									applicationFormId: 1,
									baseFieldId: 1,
									baseField: {
										createdAt: expectTimestamp,
										dataType: 'string',
										description: 'A summary of the proposal',
										id: 1,
										label: 'Summary',
										shortCode: 'summary',
									},
									position: 2,
									label: 'Long summary or abstract',
									createdAt: expectTimestamp,
								},
							},
						],
					},
				],
			});
		});
	});

	describe('POST /', () => {
		it('requires authentication', async () => {
			await agent.post('/proposals').expect(401);
		});

		it('requires a user', async () => {
			await agent.post('/proposals').set(authHeaderWithNoSubj).expect(401);
		});

		it('creates exactly one proposal', async () => {
			await db.query(`
        INSERT INTO opportunities (
          title,
          created_at
        )
        VALUES
          ( '🔥', '2525-01-02T00:00:01Z' )
      `);
			const before = await loadTableMetrics('proposals');
			const testUser = await loadTestUser();
			const result = await agent
				.post('/proposals')
				.type('application/json')
				.set(authHeader)
				.send({
					externalId: 'proposal123',
					opportunityId: 1,
				})
				.expect(201);
			const after = await loadTableMetrics('proposals');
			expect(before.count).toEqual(0);
			expect(result.body).toMatchObject({
				id: 1,
				externalId: 'proposal123',
				opportunityId: 1,
				createdAt: expectTimestamp,
				createdBy: testUser.id,
			});
			expect(after.count).toEqual(1);
		});

		it('returns 400 bad request when no external ID is sent', async () => {
			const result = await agent
				.post('/proposals')
				.type('application/json')
				.set(authHeader)
				.send({
					opportunityId: 1,
				})
				.expect(400);
			expect(result.body).toMatchObject({
				name: 'InputValidationError',
				details: expect.any(Array) as unknown[],
			});
		});

		it('returns 400 bad request when no opportunity ID is sent', async () => {
			const result = await agent
				.post('/proposals')
				.type('application/json')
				.set(authHeader)
				.send({
					externalId: 'proposal123',
				})
				.expect(400);
			expect(result.body).toMatchObject({
				name: 'InputValidationError',
				details: expect.any(Array) as unknown[],
			});
		});

		it('returns 409 conflict when a non-existent opportunity id is provided', async () => {
			const result = await agent
				.post('/proposals')
				.type('application/json')
				.set(authHeader)
				.send({
					externalId: 'proposal123',
					opportunityId: 1,
				})
				.expect(409);
			expect(result.body).toMatchObject({
				name: 'DatabaseError',
				details: [
					{
						code: PostgresErrorCode.FOREIGN_KEY_VIOLATION,
						constraint: 'fk_opportunity',
					},
				],
			});
		});
	});
});
