import request from 'supertest';
import { app } from '../app';
import { createBaseField, loadBaseFields, loadTableMetrics } from '../database';
import { BaseFieldDataType, BaseFieldScope, PostgresErrorCode } from '../types';
import { expectTimestamp } from '../test/utils';
import {
	mockJwt as authHeader,
	mockJwtWithAdminRole as adminUserAuthHeader,
} from '../test/mockJwt';

const agent = request.agent(app);

const createTestBaseField = async () =>
	createBaseField({
		defaultLabel: 'Summary',
		defaultDescription: 'A summary of the proposal',
		shortCode: 'summary',
		dataType: BaseFieldDataType.STRING,
		scope: BaseFieldScope.PROPOSAL,
	});

describe('/baseFields', () => {
	describe('GET /', () => {
		it('does not require authentication', async () => {
			await agent.get('/baseFields').expect(200);
		});

		it('returns an empty array when no data is present', async () => {
			await agent.get('/baseFields').expect(200, []);
		});

		it('returns all base fields present in the database', async () => {
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
			const result = await agent.get('/baseFields').expect(200);
			expect(result.body).toMatchObject([
				{
					id: 1,
					defaultLabel: 'First Name',
					defaultDescription: 'The first name of the applicant',
					shortCode: 'firstName',
					dataType: BaseFieldDataType.STRING,
					createdAt: expectTimestamp,
				},
				{
					id: 2,
					defaultLabel: 'Last Name',
					defaultDescription: 'The last name of the applicant',
					shortCode: 'lastName',
					dataType: BaseFieldDataType.STRING,
					createdAt: expectTimestamp,
				},
			]);
		});
	});

	describe('POST /', () => {
		it('requires authentication', async () => {
			await agent.post('/baseFields').expect(401);
		});

		it('requires administrator role', async () => {
			await agent.post('/baseFields').set(authHeader).expect(401);
		});

		it('creates exactly one base field', async () => {
			const before = await loadTableMetrics('base_fields');
			const result = await agent
				.post('/baseFields')
				.type('application/json')
				.set(adminUserAuthHeader)
				.send({
					defaultLabel: '🏷️',
					defaultDescription: '😍',
					shortCode: '🩳',
					dataType: BaseFieldDataType.STRING,
					scope: BaseFieldScope.PROPOSAL,
				})
				.expect(201);
			const after = await loadTableMetrics('base_fields');
			expect(before.count).toEqual(0);
			expect(result.body).toMatchObject({
				id: expect.any(Number) as number,
				defaultLabel: '🏷️',
				defaultDescription: '😍',
				shortCode: '🩳',
				dataType: BaseFieldDataType.STRING,
				scope: BaseFieldScope.PROPOSAL,
				createdAt: expectTimestamp,
			});
			expect(after.count).toEqual(1);
		});

		it('returns 400 bad request when no label is sent', async () => {
			const result = await agent
				.post('/baseFields')
				.type('application/json')
				.set(adminUserAuthHeader)
				.send({
					shortCode: '🩳',
					defaultDescription: '😍',
					dataType: BaseFieldDataType.STRING,
					scope: BaseFieldScope.PROPOSAL,
				})
				.expect(400);
			expect(result.body).toMatchObject({
				name: 'InputValidationError',
				details: expect.any(Array) as unknown[],
			});
		});

		it('returns 400 bad request when no description is sent', async () => {
			const result = await agent
				.post('/baseFields')
				.type('application/json')
				.set(adminUserAuthHeader)
				.send({
					defaultLabel: '🏷️',
					shortCode: '🩳',
					dataType: BaseFieldDataType.STRING,
					scope: BaseFieldScope.PROPOSAL,
				})
				.expect(400);
			expect(result.body).toMatchObject({
				name: 'InputValidationError',
				details: expect.any(Array) as unknown[],
			});
		});

		it('returns 400 bad request when no shortCode is sent', async () => {
			const result = await agent
				.post('/baseFields')
				.type('application/json')
				.set(adminUserAuthHeader)
				.send({
					defaultLabel: '🏷️',
					defaultDescription: '😍',
					dataType: BaseFieldDataType.STRING,
					scope: BaseFieldScope.PROPOSAL,
				})
				.expect(400);
			expect(result.body).toMatchObject({
				name: 'InputValidationError',
				details: expect.any(Array) as unknown[],
			});
		});

		it('returns 400 bad request when no dataType is sent', async () => {
			const result = await agent
				.post('/baseFields')
				.type('application/json')
				.set(adminUserAuthHeader)
				.send({
					defaultLabel: '🏷️',
					defaultDescription: '😍',
					shortCode: '🩳',
					scope: BaseFieldScope.PROPOSAL,
				})
				.expect(400);
			expect(result.body).toMatchObject({
				name: 'InputValidationError',
				details: expect.any(Array) as unknown[],
			});
		});

		it('returns 400 bad request when an invalid dataType is sent', async () => {
			const result = await agent
				.post('/baseFields')
				.type('application/json')
				.set(adminUserAuthHeader)
				.send({
					defaultLabel: '🏷️',
					defaultDescription: '😍',
					shortCode: '🩳',
					dataType: '🤡',
					scope: BaseFieldScope.PROPOSAL,
				})
				.expect(400);
			expect(result.body).toMatchObject({
				name: 'InputValidationError',
				details: expect.any(Array) as unknown[],
			});
		});

		it('returns 400 bad request when no scope is sent', async () => {
			const result = await agent
				.post('/baseFields')
				.type('application/json')
				.set(adminUserAuthHeader)
				.send({
					defaultLabel: '🏷️',
					defaultDescription: '😍',
					shortCode: '🩳',
					dataType: BaseFieldDataType.STRING,
				})
				.expect(400);
			expect(result.body).toMatchObject({
				name: 'InputValidationError',
				details: expect.any(Array) as unknown[],
			});
		});

		it('returns 400 bad request when an invalid scope is sent', async () => {
			const result = await agent
				.post('/baseFields')
				.type('application/json')
				.set(adminUserAuthHeader)
				.send({
					defaultLabel: '🏷️',
					defaultDescription: '😍',
					shortCode: '🩳',
					dataType: BaseFieldDataType.STRING,
					scope: '🤡',
				})
				.expect(400);
			expect(result.body).toMatchObject({
				name: 'InputValidationError',
				details: expect.any(Array) as unknown[],
			});
		});

		it('returns 409 conflict when a duplicate short name is submitted', async () => {
			await createBaseField({
				defaultLabel: 'First Name',
				defaultDescription: 'The first name of the applicant',
				shortCode: 'firstName',
				dataType: BaseFieldDataType.STRING,
				scope: BaseFieldScope.PROPOSAL,
			});
			const result = await agent
				.post('/baseFields')
				.type('application/json')
				.set(adminUserAuthHeader)
				.send({
					defaultLabel: '🏷️',
					defaultDescription: '😍',
					shortCode: 'firstName',
					dataType: BaseFieldDataType.STRING,
					scope: BaseFieldScope.PROPOSAL,
				})
				.expect(409);
			expect(result.body).toMatchObject({
				name: 'DatabaseError',
				details: [
					{
						code: PostgresErrorCode.UNIQUE_VIOLATION,
					},
				],
			});
		});
	});

	describe('PUT /:baseFieldId', () => {
		it('requires authentication', async () => {
			await agent.put('/baseFields/1').expect(401);
		});

		it('requires administrator role', async () => {
			await agent.put('/baseFields/1').set(authHeader).expect(401);
		});

		it('updates the specified base field', async () => {
			// Not using the helper here because observing a change in values is explicitly
			// the point of the test, so having full explicit control of the original value
			// seems important.  Some day when we add better test tooling we can have it all.
			await createBaseField({
				defaultLabel: 'Summary',
				defaultDescription: 'A summary of the proposal',
				shortCode: 'summary',
				dataType: BaseFieldDataType.STRING,
				scope: BaseFieldScope.PROPOSAL,
			});
			await agent
				.put('/baseFields/1')
				.type('application/json')
				.set(adminUserAuthHeader)
				.send({
					defaultLabel: '🏷️',
					defaultDescription: '😍',
					shortCode: '🩳',
					dataType: BaseFieldDataType.NUMBER,
					scope: BaseFieldScope.ORGANIZATION,
				})
				.expect(200);
			const baseFields = await loadBaseFields();
			expect(baseFields[0]).toMatchObject({
				id: 1,
				defaultLabel: '🏷️',
				defaultDescription: '😍',
				shortCode: '🩳',
				dataType: BaseFieldDataType.NUMBER,
				scope: BaseFieldScope.ORGANIZATION,
				createdAt: expectTimestamp,
			});
		});

		it('returns the updated base field', async () => {
			await createTestBaseField();
			const result = await agent
				.put('/baseFields/1')
				.type('application/json')
				.set(adminUserAuthHeader)
				.send({
					defaultLabel: '🏷️',
					defaultDescription: '😍',
					shortCode: '🩳',
					dataType: BaseFieldDataType.NUMBER,
					scope: BaseFieldScope.ORGANIZATION,
				})
				.expect(200);
			expect(result.body).toMatchObject({
				id: 1,
				defaultLabel: '🏷️',
				defaultDescription: '😍',
				shortCode: '🩳',
				dataType: BaseFieldDataType.NUMBER,
				scope: BaseFieldScope.ORGANIZATION,
				createdAt: expectTimestamp,
			});
		});

		it('returns 400 bad request when no label is sent', async () => {
			await createTestBaseField();

			const result = await agent
				.put('/baseFields/1')
				.type('application/json')
				.set(adminUserAuthHeader)
				.send({
					shortCode: '🩳',
					defaultDescription: '😍',
					dataType: BaseFieldDataType.STRING,
				})
				.expect(400);
			expect(result.body).toMatchObject({
				name: 'InputValidationError',
				details: expect.any(Array) as unknown[],
			});
		});

		it('returns 400 bad request when no description is sent', async () => {
			await createTestBaseField();
			const result = await agent
				.put('/baseFields/1')
				.type('application/json')
				.set(adminUserAuthHeader)
				.send({
					defaultLabel: '🏷️',
					shortCode: '🩳',
					dataType: BaseFieldDataType.STRING,
				})
				.expect(400);
			expect(result.body).toMatchObject({
				name: 'InputValidationError',
				details: expect.any(Array) as unknown[],
			});
		});

		it('returns 400 bad request when no shortCode is sent', async () => {
			await createTestBaseField();
			const result = await agent
				.put('/baseFields/1')
				.type('application/json')
				.set(adminUserAuthHeader)
				.send({
					defaultLabel: '🏷️',
					defaultDescription: '😍',
					dataType: BaseFieldDataType.STRING,
				})
				.expect(400);
			expect(result.body).toMatchObject({
				name: 'InputValidationError',
				details: expect.any(Array) as unknown[],
			});
		});

		it('returns 400 bad request when no dataType is sent', async () => {
			await createTestBaseField();
			const result = await agent
				.put('/baseFields/1')
				.type('application/json')
				.set(adminUserAuthHeader)
				.send({
					defaultLabel: '🏷️',
					defaultDescription: '😍',
					shortCode: '🩳',
				})
				.expect(400);
			expect(result.body).toMatchObject({
				name: 'InputValidationError',
				details: expect.any(Array) as unknown[],
			});
		});

		it('returns 400 when a non-numeric ID is sent', async () => {
			const result = await agent
				.put('/baseFields/notanumber')
				.type('application/json')
				.set(adminUserAuthHeader)
				.send({
					defaultLabel: '🏷️',
					defaultDescription: '😍',
					shortCode: 'firstName',
					dataType: BaseFieldDataType.STRING,
				})
				.expect(400);
			expect(result.body).toMatchObject({
				name: 'InputValidationError',
				details: expect.any(Array) as unknown[],
			});
		});

		it('returns 404 when attempting to update a non-existent record', async () => {
			await agent
				.put('/baseFields/1')
				.type('application/json')
				.set(adminUserAuthHeader)
				.send({
					defaultLabel: '🏷️',
					defaultDescription: '😍',
					shortCode: '🩳',
					dataType: BaseFieldDataType.STRING,
					scope: BaseFieldScope.PROPOSAL,
				})
				.expect(404);
		});
	});
});
