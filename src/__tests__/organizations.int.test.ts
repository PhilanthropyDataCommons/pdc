import request from 'supertest';
import { app } from '../app';
import { createOrganization, db, loadTableMetrics } from '../database';
import { expectTimestamp } from '../test/utils';
import { mockJwt as authHeader } from '../test/mockJwt';
import { PostgresErrorCode } from '../types';

const agent = request.agent(app);

const insertTestOrganizations = async () => {
	await createOrganization({
		employerIdentificationNumber: '11-1111111',
		name: 'Example Inc.',
	});
	await createOrganization({
		employerIdentificationNumber: '22-2222222',
		name: 'Another Inc.',
	});
};

describe('/organizations', () => {
	describe('GET /', () => {
		it('returns an empty Bundle when no data is present', async () => {
			await agent.get('/organizations').set(authHeader).expect(200, {
				total: 0,
				entries: [],
			});
		});

		it('returns organizations present in the database', async () => {
			await insertTestOrganizations();
			await agent
				.get('/organizations')
				.set(authHeader)
				.expect(200)
				.expect((res) =>
					expect(res.body).toEqual({
						total: 2,
						entries: [
							{
								id: 2,
								employerIdentificationNumber: '22-2222222',
								name: 'Another Inc.',
								createdAt: expectTimestamp,
							},
							{
								id: 1,
								employerIdentificationNumber: '11-1111111',
								name: 'Example Inc.',
								createdAt: expectTimestamp,
							},
						],
					}),
				);
		});

		it('returns according to pagination parameters', async () => {
			await Array.from(Array(20)).reduce(async (p, _, i) => {
				await p;
				await db.sql('organizations.insertOne', {
					employerIdentificationNumber: '11-1111111',
					name: `Organization ${i + 1}`,
				});
			}, Promise.resolve());
			await agent
				.get('/organizations')
				.query({
					_page: 2,
					_count: 5,
				})
				.set(authHeader)
				.expect(200)
				.expect((res) =>
					expect(res.body).toEqual({
						total: 20,
						entries: [
							{
								id: 15,
								employerIdentificationNumber: '11-1111111',
								name: 'Organization 15',
								createdAt: expectTimestamp,
							},
							{
								id: 14,
								employerIdentificationNumber: '11-1111111',
								name: 'Organization 14',
								createdAt: expectTimestamp,
							},
							{
								id: 13,
								employerIdentificationNumber: '11-1111111',
								name: 'Organization 13',
								createdAt: expectTimestamp,
							},
							{
								id: 12,
								employerIdentificationNumber: '11-1111111',
								name: 'Organization 12',
								createdAt: expectTimestamp,
							},
							{
								id: 11,
								employerIdentificationNumber: '11-1111111',
								name: 'Organization 11',
								createdAt: expectTimestamp,
							},
						],
					}),
				);
		});
	});

	describe('GET /:id', () => {
		it('returns 404 when given id is not present', async () => {
			await agent.get('/organizations/9001').set(authHeader).expect(404);
		});

		it('returns the specified organization', async () => {
			await insertTestOrganizations();
			await agent
				.get('/organizations/2')
				.set(authHeader)
				.expect(200)
				.expect((res) =>
					expect(res.body).toEqual({
						id: 2,
						employerIdentificationNumber: '22-2222222',
						name: 'Another Inc.',
						createdAt: expectTimestamp,
					}),
				);
		});

		it('returns a 400 bad request when a non-integer ID is sent', async () => {
			await insertTestOrganizations();
			await agent.get('/organizations/foo').set(authHeader).expect(400);
		});
	});

	describe('POST /', () => {
		it('creates exactly one organization', async () => {
			const before = await loadTableMetrics('organizations');
			const result = await agent
				.post('/organizations')
				.type('application/json')
				.set(authHeader)
				.send({
					employerIdentificationNumber: '11-1111111',
					name: 'Example Inc.',
				})
				.expect(201);
			const after = await loadTableMetrics('organizations');
			expect(before.count).toEqual(0);
			expect(result.body).toMatchObject({
				id: 1,
				employerIdentificationNumber: '11-1111111',
				name: 'Example Inc.',
				createdAt: expectTimestamp,
			});
			expect(after.count).toEqual(1);
		});

		it('returns 400 bad request when no employerIdentificationNumber is sent', async () => {
			const result = await agent
				.post('/organizations')
				.type('application/json')
				.set(authHeader)
				.send({
					name: 'Foo Co.',
				})
				.expect(400);
			expect(result.body).toMatchObject({
				name: 'InputValidationError',
				details: expect.any(Array) as unknown[],
			});
		});

		it('returns 400 bad request when no name is sent', async () => {
			const result = await agent
				.post('/organizations')
				.type('application/json')
				.set(authHeader)
				.send({
					employerIdentificationNumber: '11-1111111',
				})
				.expect(400);
			expect(result.body).toMatchObject({
				name: 'InputValidationError',
				details: expect.any(Array) as unknown[],
			});
		});

		it('returns 409 conflict when an existing EIN + name combination is submitted', async () => {
			await createOrganization({
				employerIdentificationNumber: '11-1111111',
				name: 'Example Inc.',
			});
			const result = await agent
				.post('/organizations')
				.type('application/json')
				.set(authHeader)
				.send({
					employerIdentificationNumber: '11-1111111',
					name: 'Example Inc.',
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
});