import request from 'supertest';
import { app } from '../app';
import {
	createApplicationForm,
	createApplicationFormField,
	createBaseField,
	createOpportunity,
	createProposal,
	loadTableMetrics,
} from '../database';
import { getLogger } from '../logger';
import { BaseFieldDataType, BaseFieldScope } from '../types';
import { expectTimestamp, loadTestUser } from '../test/utils';
import { mockJwt as authHeader } from '../test/mockJwt';

const logger = getLogger(__filename);
const agent = request.agent(app);

const createTestBaseFields = async () => {
	await createBaseField({
		defaultLabel: 'First Name',
		defaultDescription: 'The first name of the applicant',
		shortCode: 'firstName',
		dataType: BaseFieldDataType.STRING,
		scope: BaseFieldScope.PROPOSAL,
	});
	await createBaseField({
		defaultLabel: 'Last Name',
		defaultDescription: 'The last name of the applicant',
		shortCode: 'lastName',
		dataType: BaseFieldDataType.STRING,
		scope: BaseFieldScope.PROPOSAL,
	});
};

describe('/proposalVersions', () => {
	describe('POST /', () => {
		it('requires authentication', async () => {
			await agent.post('/proposalVersions').expect(401);
		});

		it('creates exactly one proposal version', async () => {
			await createOpportunity({ title: '🔥' });
			const testUser = await loadTestUser();
			await createProposal({
				externalId: 'proposal-1',
				opportunityId: 1,
				createdBy: testUser.id,
			});
			await createApplicationForm({
				opportunityId: 1,
			});
			const before = await loadTableMetrics('proposal_versions');
			logger.debug('before: %o', before);
			const result = await agent
				.post('/proposalVersions')
				.type('application/json')
				.set(authHeader)
				.send({
					proposalId: 1,
					applicationFormId: 1,
					fieldValues: [],
				})
				.expect(201);
			const after = await loadTableMetrics('proposal_versions');
			logger.debug('after: %o', after);
			expect(before.count).toEqual(0);
			expect(result.body).toMatchObject({
				id: 1,
				proposalId: 1,
				fieldValues: [],
			});
			expect(after.count).toEqual(1);
		});

		it('creates exactly the number of provided field values', async () => {
			await createOpportunity({ title: '🔥' });
			const testUser = await loadTestUser();
			await createProposal({
				externalId: 'proposal-1',
				opportunityId: 1,
				createdBy: testUser.id,
			});
			await createApplicationForm({
				opportunityId: 1,
			});
			await createTestBaseFields();
			await createApplicationFormField({
				applicationFormId: 1,
				baseFieldId: 1,
				position: 1,
				label: 'First Name',
			});
			await createApplicationFormField({
				applicationFormId: 1,
				baseFieldId: 2,
				position: 2,
				label: 'Last Name',
			});
			const before = await loadTableMetrics('proposal_field_values');
			const result = await agent
				.post('/proposalVersions')
				.type('application/json')
				.set(authHeader)
				.send({
					proposalId: 1,
					applicationFormId: 1,
					fieldValues: [
						{
							applicationFormFieldId: 1,
							position: 1,
							value: 'Gronald',
							isValid: true,
						},
						{
							applicationFormFieldId: 2,
							position: 1,
							value: 'Plorp',
							isValid: true,
						},
					],
				})
				.expect(201);
			const after = await loadTableMetrics('proposal_field_values');

			expect(before.count).toEqual(0);
			expect(result.body).toMatchObject({
				id: 1,
				proposalId: 1,
				fieldValues: [
					{
						id: expect.any(Number) as number,
						applicationFormFieldId: 1,
						position: 1,
						value: 'Gronald',
						isValid: true,
						createdAt: expectTimestamp,
					},
					{
						id: expect.any(Number) as number,
						applicationFormFieldId: 2,
						position: 1,
						value: 'Plorp',
						isValid: true,
						createdAt: expectTimestamp,
					},
				],
			});
			expect(after.count).toEqual(2);
		});

		it('returns 400 bad request when no proposal id is provided', async () => {
			await agent
				.post('/proposalVersions')
				.type('application/json')
				.set(authHeader)
				.send({
					applicationFormId: 1,
					fieldValues: [],
				})
				.expect(400);
		});

		it('returns 400 bad request when no application id is provided', async () => {
			await agent
				.post('/proposalVersions')
				.type('application/json')
				.set(authHeader)
				.send({
					proposalId: 1,
					fieldValues: [],
				})
				.expect(400);
		});

		it('returns 400 bad request when no field values array is provided', async () => {
			await agent
				.post('/proposalVersions')
				.type('application/json')
				.set(authHeader)
				.send({
					proposalId: 1,
					applicationFormId: 1,
				})
				.expect(400);
		});

		it('returns 409 Conflict when the provided proposal does not exist', async () => {
			await createOpportunity({ title: '🔥' });
			const testUser = await loadTestUser();
			await createProposal({
				externalId: 'proposal-1',
				opportunityId: 1,
				createdBy: testUser.id,
			});
			await createApplicationForm({
				opportunityId: 1,
			});
			const result = await agent
				.post('/proposalVersions')
				.type('application/json')
				.set(authHeader)
				.send({
					proposalId: 2,
					applicationFormId: 1,
					fieldValues: [],
				})
				.expect(409);

			expect(result.body).toMatchObject({
				name: 'InputConflictError',
				details: [
					{
						entityType: 'Proposal',
						entityId: 2,
					},
				],
			});
		});

		it('Returns 409 Conflict if the provided application form does not exist', async () => {
			await createOpportunity({ title: '🔥' });
			const testUser = await loadTestUser();
			await createProposal({
				externalId: 'proposal-1',
				opportunityId: 1,
				createdBy: testUser.id,
			});
			await createApplicationForm({
				opportunityId: 1,
			});
			const before = await loadTableMetrics('proposal_field_values');
			logger.debug('before: %o', before);
			const result = await agent
				.post('/proposalVersions')
				.type('application/json')
				.set(authHeader)
				.send({
					proposalId: 1,
					applicationFormId: 2,
					fieldValues: [],
				})
				.expect(409);
			const after = await loadTableMetrics('proposal_field_values');
			logger.debug('after: %o', after);
			expect(before.count).toEqual(0);
			expect(result.body).toMatchObject({
				name: 'InputConflictError',
				details: [
					{
						entityType: 'ApplicationForm',
						entityId: 2,
					},
				],
			});
			expect(after.count).toEqual(0);
		});

		it('Returns 409 Conflict if the provided application form ID is not associated with the proposal opportunity', async () => {
			await createOpportunity({ title: '🔥' });
			await createOpportunity({ title: '💧' });
			const testUser = await loadTestUser();
			await createProposal({
				externalId: 'proposal-1',
				opportunityId: 1,
				createdBy: testUser.id,
			});
			await createApplicationForm({
				opportunityId: 1,
			});
			await createApplicationForm({
				opportunityId: 2,
			});
			const before = await loadTableMetrics('proposal_field_values');
			logger.debug('before: %o', before);
			const result = await agent
				.post('/proposalVersions')
				.type('application/json')
				.set(authHeader)
				.send({
					proposalId: 1,
					applicationFormId: 2,
					fieldValues: [],
				})
				.expect(409);
			const after = await loadTableMetrics('proposal_field_values');
			logger.debug('after: %o', after);
			expect(before.count).toEqual(0);
			expect(result.body).toMatchObject({
				name: 'InputConflictError',
				details: [
					{
						entityType: 'ApplicationForm',
						entityId: 2,
						contextEntityType: 'Proposal',
						contextEntityId: 1,
					},
				],
			});
			expect(after.count).toEqual(0);
		});

		it('Returns 409 Conflict if a provided application form field ID does not exist', async () => {
			await createOpportunity({ title: '🔥' });
			const testUser = await loadTestUser();
			await createProposal({
				externalId: 'proposal-1',
				opportunityId: 1,
				createdBy: testUser.id,
			});
			await createApplicationForm({
				opportunityId: 1,
			});
			const before = await loadTableMetrics('proposal_field_values');
			logger.debug('before: %o', before);
			const result = await agent
				.post('/proposalVersions')
				.type('application/json')
				.set(authHeader)
				.send({
					proposalId: 1,
					applicationFormId: 1,
					fieldValues: [
						{
							applicationFormFieldId: 1,
							position: 1,
							value: 'Gronald',
							isValid: true,
						},
					],
				})
				.expect(409);
			const after = await loadTableMetrics('proposal_field_values');
			logger.debug('after: %o', after);
			expect(before.count).toEqual(0);
			expect(result.body).toMatchObject({
				name: 'InputConflictError',
				details: [
					{
						entityType: 'ApplicationFormField',
						entityId: 1,
					},
				],
			});
			expect(after.count).toEqual(0);
		});

		it('Returns 409 Conflict if a provided application form field ID is not associated with the supplied application form ID', async () => {
			await createOpportunity({ title: '🔥' });
			const testUser = await loadTestUser();
			await createProposal({
				externalId: 'proposal-1',
				opportunityId: 1,
				createdBy: testUser.id,
			});
			await createApplicationForm({
				opportunityId: 1,
			});
			await createApplicationForm({
				opportunityId: 1,
			});
			await createTestBaseFields();
			await createApplicationFormField({
				applicationFormId: 1,
				baseFieldId: 1,
				position: 1,
				label: 'First Name',
			});
			await createApplicationFormField({
				applicationFormId: 1,
				baseFieldId: 2,
				position: 2,
				label: 'Last Name',
			});
			const before = await loadTableMetrics('proposal_field_values');
			logger.debug('before: %o', before);
			const result = await agent
				.post('/proposalVersions')
				.type('application/json')
				.set(authHeader)
				.send({
					proposalId: 1,
					applicationFormId: 2,
					fieldValues: [
						{
							applicationFormFieldId: 1,
							position: 1,
							value: 'Gronald',
							isValid: true,
						},
					],
				})
				.expect(409);
			const after = await loadTableMetrics('proposal_field_values');
			logger.debug('after: %o', after);
			expect(before.count).toEqual(0);
			expect(result.body).toMatchObject({
				name: 'InputConflictError',
				details: [
					{
						entityType: 'ApplicationForm',
						entityId: 2,
						contextEntityType: 'ApplicationFormField',
						contextEntityId: 1,
					},
				],
			});
			expect(after.count).toEqual(0);
		});
	});
});
