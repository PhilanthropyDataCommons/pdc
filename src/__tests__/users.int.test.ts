import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { app } from '../app';
import {
	createChangemaker,
	createOrUpdateChangemakerRole,
	createOrUpdateDataProvider,
	createOrUpdateDataProviderRole,
	createOrUpdateFunder,
	createOrUpdateFunderRole,
	createUser,
	loadSystemUser,
	loadTableMetrics,
} from '../database';
import { expectTimestamp, loadTestUser } from '../test/utils';
import {
	mockJwt as authHeader,
	mockJwtWithAdminRole as authHeaderWithAdminRole,
} from '../test/mockJwt';
import { keycloakUserIdToString, stringToKeycloakUserId } from '../types';
import { AccessType } from '../types/AccessType';

const createAdditionalTestUser = async () =>
	createUser({
		keycloakUserId: stringToKeycloakUserId(
			'123e4567-e89b-12d3-a456-426614174000',
		),
	});

describe('/users', () => {
	describe('GET /', () => {
		it('requires authentication', async () => {
			await request(app).get('/users').expect(401);
		});

		it('returns the user associated with the requesting user', async () => {
			const testUser = await loadTestUser();
			await createAdditionalTestUser();
			const { count: userCount } = await loadTableMetrics('users');

			const response = await request(app)
				.get('/users')
				.set(authHeader)
				.expect(200);
			expect(response.body).toEqual({
				total: userCount,
				entries: [
					{
						keycloakUserId: testUser.keycloakUserId,
						roles: {
							changemaker: {},
							dataProvider: {},
							funder: {},
						},
						createdAt: expectTimestamp,
					},
				],
			});
		});

		it('returns the roles associated with a user', async () => {
			const systemUser = await loadSystemUser();
			const testUser = await loadTestUser();
			const dataProvider = await createOrUpdateDataProvider({
				name: 'Test Provider',
				shortCode: 'testProvider',
			});
			const funder = await createOrUpdateFunder({
				name: 'Test Funder',
				shortCode: 'testFunder',
			});
			const changemaker = await createChangemaker({
				name: 'Test Changemaker',
				taxId: '12-3456789',
			});
			await createOrUpdateDataProviderRole({
				dataProviderShortCode: dataProvider.shortCode,
				userKeycloakUserId: testUser.keycloakUserId,
				accessType: AccessType.MANAGE,
				createdBy: systemUser.keycloakUserId,
			});
			await createOrUpdateFunderRole({
				funderShortCode: funder.shortCode,
				userKeycloakUserId: testUser.keycloakUserId,
				accessType: AccessType.EDIT,
				createdBy: systemUser.keycloakUserId,
			});
			await createOrUpdateChangemakerRole({
				changemakerId: changemaker.id,
				userKeycloakUserId: testUser.keycloakUserId,
				accessType: AccessType.VIEW,
				createdBy: systemUser.keycloakUserId,
			});
			const { count: userCount } = await loadTableMetrics('users');

			const response = await request(app)
				.get('/users')
				.set(authHeader)
				.expect(200);
			expect(response.body).toEqual({
				total: userCount,
				entries: [
					{
						keycloakUserId: testUser.keycloakUserId,
						roles: {
							changemaker: {
								[changemaker.id]: {
									view: true,
								},
							},
							dataProvider: {
								testProvider: {
									manage: true,
								},
							},
							funder: {
								testFunder: {
									edit: true,
								},
							},
						},
						createdAt: expectTimestamp,
					},
				],
			});
		});

		it('returns all users when the user is an administrator', async () => {
			const systemUser = await loadSystemUser();
			const testUser = await loadTestUser();
			const anotherUser = await createAdditionalTestUser();
			const { count: userCount } = await loadTableMetrics('users');

			const response = await request(app)
				.get('/users')
				.set(authHeaderWithAdminRole)
				.expect(200);
			expect(response.body).toEqual({
				total: userCount,
				entries: [anotherUser, testUser, systemUser],
			});
		});

		it('returns a specific user when a keycloakUserId is provided', async () => {
			const anotherUser = await createAdditionalTestUser();
			const { count: userCount } = await loadTableMetrics('users');

			const response = await request(app)
				.get(
					`/users?keycloakUserId=${keycloakUserIdToString(anotherUser.keycloakUserId)}`,
				)
				.set(authHeaderWithAdminRole)
				.expect(200);
			expect(response.body).toEqual({
				total: userCount,
				entries: [anotherUser],
			});
		});

		it('returns 400 when an invalid keycloakUserId is provided', async () => {
			await request(app)
				.get(`/users?keycloakUserId=thisisnotauuid`)
				.set(authHeaderWithAdminRole)
				.expect(400);
		});

		it('returns according to pagination parameters', async () => {
			const uuids = Array.from(Array(20)).map(() => uuidv4());
			await uuids.reduce(async (p, uuid) => {
				await p;
				await createUser({
					keycloakUserId: uuid,
				});
			}, Promise.resolve());
			const { count: userCount } = await loadTableMetrics('users');

			const response = await request(app)
				.get('/users')
				.query({
					_page: 2,
					_count: 5,
				})
				.set(authHeaderWithAdminRole)
				.expect(200);
			expect(response.body).toEqual({
				total: userCount,
				entries: [
					{
						keycloakUserId: uuids[14],
						roles: {
							changemaker: {},
							dataProvider: {},
							funder: {},
						},
						createdAt: expectTimestamp,
					},
					{
						keycloakUserId: uuids[13],
						roles: {
							changemaker: {},
							dataProvider: {},
							funder: {},
						},
						createdAt: expectTimestamp,
					},
					{
						keycloakUserId: uuids[12],
						roles: {
							changemaker: {},
							dataProvider: {},
							funder: {},
						},
						createdAt: expectTimestamp,
					},
					{
						keycloakUserId: uuids[11],
						roles: {
							changemaker: {},
							dataProvider: {},
							funder: {},
						},
						createdAt: expectTimestamp,
					},
					{
						keycloakUserId: uuids[10],
						roles: {
							changemaker: {},
							dataProvider: {},
							funder: {},
						},
						createdAt: expectTimestamp,
					},
				],
			});
		});
	});
});
