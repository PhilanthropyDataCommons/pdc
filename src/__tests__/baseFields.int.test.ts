import request from 'supertest';
import { app } from '../app';
import {
	createBaseField,
	createOrUpdateBaseFieldLocalization,
	loadBaseFieldLocalizations,
	loadBaseFields,
	loadTableMetrics,
} from '../database';
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

const createTestBaseFieldWithLocalization = async () => {
	const baseField = await createBaseField({
		defaultLabel: 'Summary',
		defaultDescription: 'A summary of the proposal',
		shortCode: 'summary',
		dataType: BaseFieldDataType.STRING,
		scope: BaseFieldScope.PROPOSAL,
	});

	await createOrUpdateBaseFieldLocalization({
		baseFieldId: baseField.id,
		language: 'fr',
		label: 'Résume',
		description: 'Le Résume de proposal',
	});
};
describe('/baseFields', () => {
	describe('GET /', () => {
		it('does not require authentication', async () => {
			await agent.get('/baseFields').expect(200);
		});

		it('returns an empty array when no data is present', async () => {
			await agent.get('/baseFields').expect(200, []);
		});

		it('returns all base fields present in the database along with their localizations', async () => {
			const baseFieldOne = await createBaseField({
				defaultLabel: 'First Name',
				defaultDescription: 'The first name of the applicant',
				shortCode: 'firstName',
				dataType: BaseFieldDataType.STRING,
				scope: BaseFieldScope.PROPOSAL,
			});
			const baseFieldTwo = await createBaseField({
				defaultLabel: 'Last Name',
				defaultDescription: 'The last name of the applicant',
				shortCode: 'lastName',
				dataType: BaseFieldDataType.STRING,
				scope: BaseFieldScope.PROPOSAL,
			});

			await createOrUpdateBaseFieldLocalization({
				baseFieldId: baseFieldOne.id,
				language: 'fr',
				label: 'prenom',
				description: 'le prenom',
			});

			await createOrUpdateBaseFieldLocalization({
				baseFieldId: baseFieldTwo.id,
				language: 'fr',
				label: 'postnom',
				description: 'le postnom',
			});

			const result = await agent.get('/baseFields').expect(200);
			expect(result.body).toMatchObject([
				{
					id: 1,
					defaultLabel: 'First Name',
					defaultDescription: 'The first name of the applicant',
					shortCode: 'firstName',
					dataType: BaseFieldDataType.STRING,
					scope: BaseFieldScope.PROPOSAL,
					localizations: {
						fr: {
							label: 'prenom',
							language: 'fr',
							createdAt: expectTimestamp,
							baseFieldId: 1,
							description: 'le prenom',
						},
					},
					createdAt: expectTimestamp,
				},
				{
					id: 2,
					defaultLabel: 'Last Name',
					defaultDescription: 'The last name of the applicant',
					shortCode: 'lastName',
					dataType: BaseFieldDataType.STRING,
					scope: BaseFieldScope.PROPOSAL,
					localizations: {
						fr: {
							label: 'postnom',
							language: 'fr',
							createdAt: expectTimestamp,
							baseFieldId: 2,
							description: 'le postnom',
						},
					},
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
				localizations: {},
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
				localizations: {},

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
				localizations: {},
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
	describe('PUT /:baseFieldId/:language', () => {
		it('requires authentication', async () => {
			await agent.put('/baseFields/1/fr').expect(401);
		});

		it('requires administrator role', async () => {
			await agent.put('/baseFields/1/fr').set(authHeader).expect(401);
		});

		it('creates the specified base field if it does not exist', async () => {
			await createTestBaseField();
			await agent
				.put('/baseFields/1/fr')
				.type('application/json')
				.set(adminUserAuthHeader)
				.send({
					label: 'Résume',
					description: 'Le Résume de proposal',
				})
				.expect(200);
			const baseFieldLocalizations = await loadBaseFieldLocalizations();
			expect(baseFieldLocalizations[0]).toMatchObject({
				baseFieldId: 1,
				label: 'Résume',
				description: 'Le Résume de proposal',
				createdAt: expectTimestamp,
			});
		});

		it('updates the specified base field if it does exist', async () => {
			await createTestBaseFieldWithLocalization();
			await agent
				.put('/baseFields/1/fr')
				.type('application/json')
				.set(adminUserAuthHeader)
				.send({
					label: 'Le Résume',
					description: 'Le grand Résume de proposal',
				})
				.expect(200);
			const baseFieldLocalizations = await loadBaseFieldLocalizations();
			expect(baseFieldLocalizations[0]).toMatchObject({
				baseFieldId: 1,
				label: 'Le Résume',
				description: 'Le grand Résume de proposal',
				createdAt: expectTimestamp,
			});
		});

		it('returns the created or updated base field', async () => {
			await createTestBaseField();
			const result = await agent
				.put('/baseFields/1/fr')
				.type('application/json')
				.set(adminUserAuthHeader)
				.send({
					label: 'Résume',
					description: 'Le Résume de proposal',
				})
				.expect(200);
			expect(result.body).toMatchObject({
				baseFieldId: 1,
				label: 'Résume',
				description: 'Le Résume de proposal',
				createdAt: expectTimestamp,
			});
		});

		it('returns 400 bad request when no label is sent', async () => {
			await createTestBaseField();

			const result = await agent
				.put('/baseFields/1/fr')
				.type('application/json')
				.set(adminUserAuthHeader)
				.send({
					description: 'Le Résume de proposal',
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
				.put('/baseFields/1/fr')
				.type('application/json')
				.set(adminUserAuthHeader)
				.send({
					label: 'Résume',
				})
				.expect(400);
			expect(result.body).toMatchObject({
				name: 'InputValidationError',
				details: expect.any(Array) as unknown[],
			});
		});

		it('returns 400 when a non-numeric ID is sent', async () => {
			const result = await agent
				.put('/baseFields/notanumber/fr')
				.type('application/json')
				.set(adminUserAuthHeader)
				.send({
					label: 'Résume',
					description: 'Le Résume de proposal',
				})
				.expect(400);
			expect(result.body).toMatchObject({
				name: 'InputValidationError',
				details: expect.any(Array) as unknown[],
			});
		});

		it('returns 422 conflict when a base field is referenced that does not exist', async () => {
			const result = await agent
				.put('/baseFields/1/fr')
				.type('application/json')
				.set(adminUserAuthHeader)
				.send({
					label: 'Résume',
					description: 'Le Résume de proposal',
				})
				.expect(422);
			expect(result.body).toMatchObject({
				name: 'DatabaseError',
				details: [
					{
						code: PostgresErrorCode.FOREIGN_KEY_VIOLATION,
					},
				],
			});
		});
	});
});
