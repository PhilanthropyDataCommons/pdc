import request from 'supertest';
import { app } from '../app';
import {
	createOrUpdateFunder,
	createOrUpdateUserFunderPermission,
	loadSystemUser,
} from '../database';
import { expectTimestamp, loadTestUser } from '../test/utils';
import {
	mockJwt as authHeader,
	mockJwtWithAdminRole as authHeaderWithAdminRole,
} from '../test/mockJwt';
import { keycloakIdToString, Permission } from '../types';

describe('/users/funders/:funderShortcode/permissions/:permission', () => {
	describe('PUT /', () => {
		it('returns 401 if the request lacks authentication', async () => {
			const user = await loadTestUser();
			const funder = await createOrUpdateFunder({
				shortCode: 'ExampleInc',
				name: 'Example Inc.',
				keycloakOrganizationId: null,
			});
			await request(app)
				.put(
					`/users/${keycloakIdToString(user.keycloakUserId)}/funders/${funder.shortCode}/permissions/${Permission.MANAGE}`,
				)
				.send({})
				.expect(401);
		});

		it('returns 401 if the authenticated user lacks permission', async () => {
			const user = await loadTestUser();
			const funder = await createOrUpdateFunder({
				shortCode: 'ExampleInc',
				name: 'Example Inc.',
				keycloakOrganizationId: null,
			});

			await request(app)
				.put(
					`/users/${keycloakIdToString(user.keycloakUserId)}/funders/${funder.shortCode}/permissions/${Permission.MANAGE}`,
				)
				.set(authHeader)
				.send({})
				.expect(401);
		});

		it('returns 400 if the userId is not a valid keycloak user ID', async () => {
			await request(app)
				.put(
					`/users/notaguid/funders/ExampleInc/permissions/${Permission.MANAGE}`,
				)
				.set(authHeaderWithAdminRole)
				.send({})
				.expect(400);
		});

		it('returns 400 if the funder ID is not a valid shortcode', async () => {
			const user = await loadTestUser();
			await request(app)
				.put(
					`/users/${keycloakIdToString(user.keycloakUserId)}/changemakers/this is not valid/permissions/${Permission.MANAGE}`,
				)
				.set(authHeaderWithAdminRole)
				.send({})
				.expect(400);
		});

		it('returns 400 if the permission is not a valid permission', async () => {
			const user = await loadTestUser();
			await request(app)
				.put(
					`/users/${keycloakIdToString(user.keycloakUserId)}/funders/ExampleInc/permissions/notAPermission`,
				)
				.set(authHeaderWithAdminRole)
				.send({})
				.expect(400);
		});

		it('creates and returns the new user funder permission when user has administrative credentials', async () => {
			const user = await loadTestUser();
			const funder = await createOrUpdateFunder({
				shortCode: 'ExampleInc',
				name: 'Example Inc.',
				keycloakOrganizationId: null,
			});

			const response = await request(app)
				.put(
					`/users/${keycloakIdToString(user.keycloakUserId)}/funders/${funder.shortCode}/permissions/${Permission.EDIT}`,
				)
				.set(authHeaderWithAdminRole)
				.send({})
				.expect(201);
			expect(response.body).toEqual({
				funderShortCode: funder.shortCode,
				createdAt: expectTimestamp,
				createdBy: user.keycloakUserId,
				permission: Permission.EDIT,
				userKeycloakUserId: user.keycloakUserId,
			});
		});

		it('creates and returns the new user funder permission when user has permission to manage the funder', async () => {
			const user = await loadTestUser();
			const funder = await createOrUpdateFunder({
				shortCode: 'ExampleInc',
				name: 'Example Inc.',
				keycloakOrganizationId: null,
			});
			await createOrUpdateUserFunderPermission({
				userKeycloakUserId: user.keycloakUserId,
				funderShortCode: funder.shortCode,
				permission: Permission.MANAGE,
				createdBy: user.keycloakUserId,
			});

			const response = await request(app)
				.put(
					`/users/${keycloakIdToString(user.keycloakUserId)}/funders/${funder.shortCode}/permissions/${Permission.EDIT}`,
				)
				.set(authHeader)
				.send({})
				.expect(201);
			expect(response.body).toEqual({
				funderShortCode: funder.shortCode,
				createdAt: expectTimestamp,
				createdBy: user.keycloakUserId,
				permission: Permission.EDIT,
				userKeycloakUserId: user.keycloakUserId,
			});
		});

		it('does not update `createdBy`, but returns the user funder permission when user has permission to manage the funder', async () => {
			const user = await loadTestUser();
			const systemUser = await loadSystemUser();
			const funder = await createOrUpdateFunder({
				shortCode: 'ExampleInc',
				name: 'Example Inc.',
				keycloakOrganizationId: null,
			});
			await createOrUpdateUserFunderPermission({
				userKeycloakUserId: user.keycloakUserId,
				funderShortCode: funder.shortCode,
				permission: Permission.MANAGE,
				createdBy: systemUser.keycloakUserId,
			});

			const response = await request(app)
				.put(
					`/users/${keycloakIdToString(user.keycloakUserId)}/funders/${funder.shortCode}/permissions/${Permission.MANAGE}`,
				)
				.set(authHeader)
				.send({})
				.expect(201);
			expect(response.body).toEqual({
				funderShortCode: funder.shortCode,
				createdAt: expectTimestamp,
				createdBy: systemUser.keycloakUserId,
				permission: Permission.MANAGE,
				userKeycloakUserId: user.keycloakUserId,
			});
		});
	});
});
