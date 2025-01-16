import request from 'supertest';
import { app } from '../app';
import {
	createApplicationForm,
	createApplicationFormField,
	createBaseField,
	createOpportunity,
	createChangemaker,
	createChangemakerProposal,
	createOrUpdateFunder,
	createProposal,
	createProposalFieldValue,
	createProposalVersion,
	createSource,
	loadSystemSource,
	loadSystemUser,
	loadTableMetrics,
	createOrUpdateDataProvider,
	updateChangemaker,
} from '../database';
import { expectTimestamp, loadTestUser } from '../test/utils';
import { mockJwt as authHeader } from '../test/mockJwt';
import {
	BaseField,
	BaseFieldDataType,
	BaseFieldScope,
	Changemaker,
	DataProvider,
	Funder,
	Id,
	Opportunity,
	PostgresErrorCode,
	Source,
	stringToKeycloakId,
	User,
} from '../types';
import { NotFoundError } from '../errors';

const insertTestChangemakers = async () => {
	await createChangemaker(null, {
		taxId: '11-1111111',
		name: 'Example Inc.',
		keycloakOrganizationId: null,
	});
	await createChangemaker(null, {
		taxId: '22-2222222',
		name: 'Another Inc.',
		keycloakOrganizationId: '57ceaca8-be48-11ef-8c91-5732d98a77e1',
	});
};

describe('/changemakers', () => {
	describe('GET /', () => {
		it('does not require authentication', async () => {
			await request(app).get('/changemakers').expect(200);
		});

		it('returns an empty Bundle when no data is present', async () => {
			await request(app).get('/changemakers').set(authHeader).expect(200, {
				total: 0,
				entries: [],
			});
		});

		it('returns changemakers present in the database', async () => {
			await insertTestChangemakers();
			await request(app)
				.get('/changemakers')
				.set(authHeader)
				.expect(200)
				.expect((res) =>
					expect(res.body).toEqual({
						total: 2,
						entries: [
							{
								id: 2,
								taxId: '22-2222222',
								name: 'Another Inc.',
								keycloakOrganizationId: '57ceaca8-be48-11ef-8c91-5732d98a77e1',
								createdAt: expectTimestamp,
								fields: [],
							},
							{
								id: 1,
								taxId: '11-1111111',
								name: 'Example Inc.',
								keycloakOrganizationId: null,
								createdAt: expectTimestamp,
								fields: [],
							},
						],
					}),
				);
		});

		it('returns according to pagination parameters', async () => {
			await Array.from(Array(20)).reduce(async (p, _, i) => {
				await p;
				await createChangemaker(null, {
					taxId: '11-1111111',
					name: `Changemaker ${i + 1}`,
					keycloakOrganizationId: null,
				});
			}, Promise.resolve());
			await request(app)
				.get('/changemakers')
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
								taxId: '11-1111111',
								name: 'Changemaker 15',
								keycloakOrganizationId: null,
								createdAt: expectTimestamp,
								fields: [],
							},
							{
								id: 14,
								taxId: '11-1111111',
								name: 'Changemaker 14',
								keycloakOrganizationId: null,
								createdAt: expectTimestamp,
								fields: [],
							},
							{
								id: 13,
								taxId: '11-1111111',
								name: 'Changemaker 13',
								keycloakOrganizationId: null,
								createdAt: expectTimestamp,
								fields: [],
							},
							{
								id: 12,
								taxId: '11-1111111',
								name: 'Changemaker 12',
								keycloakOrganizationId: null,
								createdAt: expectTimestamp,
								fields: [],
							},
							{
								id: 11,
								taxId: '11-1111111',
								name: 'Changemaker 11',
								keycloakOrganizationId: null,
								createdAt: expectTimestamp,
								fields: [],
							},
						],
					}),
				);
		});

		it('returns a subset of changemakers present in the database when a proposal filter is provided', async () => {
			await createOpportunity(null, {
				title: '🔥',
			});
			const testUser = await loadTestUser();
			await createProposal(null, {
				externalId: 'proposal-1',
				opportunityId: 1,
				createdBy: testUser.keycloakUserId,
			});
			await createChangemaker(null, {
				taxId: '123-123-123',
				name: 'Canadian Company',
				keycloakOrganizationId: null,
			});
			await createChangemaker(null, {
				taxId: '123-123-123',
				name: 'Another Canadian Company',
				keycloakOrganizationId: null,
			});
			await createChangemakerProposal(null, {
				changemakerId: 1,
				proposalId: 1,
			});
			const response = await request(app)
				.get(`/changemakers?proposal=1`)
				.set(authHeader)
				.expect(200);
			expect(response.body).toEqual({
				total: 2,
				entries: [
					{
						id: 1,
						taxId: '123-123-123',
						name: 'Canadian Company',
						keycloakOrganizationId: null,
						createdAt: expectTimestamp,
						fields: [],
					},
				],
			});
		});

		it('does not return duplicate changemakers when a changemaker has multiple proposals', async () => {
			await createOpportunity(null, {
				title: '🔥',
			});
			const testUser = await loadTestUser();
			await createProposal(null, {
				externalId: 'proposal-1',
				opportunityId: 1,
				createdBy: testUser.keycloakUserId,
			});
			await createProposal(null, {
				externalId: 'proposal-2',
				opportunityId: 1,
				createdBy: testUser.keycloakUserId,
			});
			await createChangemaker(null, {
				taxId: '123-123-123',
				name: 'Canadian Company',
				keycloakOrganizationId: null,
			});
			await createChangemakerProposal(null, {
				changemakerId: 1,
				proposalId: 1,
			});
			await createChangemakerProposal(null, {
				changemakerId: 1,
				proposalId: 2,
			});
			const response = await request(app)
				.get(`/changemakers`)
				.set(authHeader)
				.expect(200);
			expect(response.body).toEqual({
				total: 1,
				entries: [
					{
						id: 1,
						taxId: '123-123-123',
						name: 'Canadian Company',
						keycloakOrganizationId: null,
						createdAt: expectTimestamp,
						fields: [],
					},
				],
			});
		});

		it('returns a 400 error if an invalid changemaker filter is provided', async () => {
			const response = await request(app)
				.get(`/proposals?changemaker=foo`)
				.set(authHeader)
				.expect(400);
			expect(response.body).toMatchObject({
				name: 'InputValidationError',
				message: expect.any(String) as string,
			});
		});
	});

	describe('GET /:id', () => {
		it('does not require authentication', async () => {
			await insertTestChangemakers();
			await request(app).get('/changemakers/1').expect(200);
		});

		it('returns 404 when given id is not present', async () => {
			await request(app).get('/changemakers/9001').set(authHeader).expect(404);
		});

		it('returns the specified changemaker', async () => {
			await insertTestChangemakers();
			await request(app)
				.get('/changemakers/2')
				.set(authHeader)
				.expect(200)
				.expect((res) =>
					expect(res.body).toEqual({
						id: 2,
						taxId: '22-2222222',
						name: 'Another Inc.',
						keycloakOrganizationId: '57ceaca8-be48-11ef-8c91-5732d98a77e1',
						createdAt: expectTimestamp,
						fields: [],
					}),
				);
		});

		it('returns a 400 bad request when a non-integer ID is sent', async () => {
			await request(app).get('/changemakers/foo').set(authHeader).expect(400);
		});

		describe('tests that find gold data among proposals and share a common db', () => {
			let systemSource: Source;
			let systemUser: User;
			let baseFieldEmail: BaseField;
			let baseFieldPhone: BaseField;
			let baseFieldWebsite: BaseField;
			let firstChangemaker: Changemaker;
			let secondChangemaker: Changemaker;
			let secondChangemakerSourceId: Id;
			let firstFunder: Funder;
			let firstFunderOpportunity: Opportunity;
			let firstFunderSourceId: Id;
			let firstDataProvider: DataProvider;
			let firstDataProviderSourceId: Id;
			let secondDataProvider: DataProvider;
			let secondDataProviderSourceId: Id;

			beforeEach(async () => {
				systemSource = await loadSystemSource(null);
				systemUser = await loadSystemUser(null);
				baseFieldEmail = await createBaseField(null, {
					label: 'Fifty one fifty three',
					shortCode: 'fifty_one_fifty_three',
					description: 'Five thousand one hundred fifty three.',
					dataType: BaseFieldDataType.EMAIL,
					scope: BaseFieldScope.ORGANIZATION,
				});
				baseFieldPhone = await createBaseField(null, {
					label: 'Fifty three ninety nine',
					shortCode: 'fifty_three_ninety_nine',
					description: 'Five thousand three hundred ninety nine.',
					dataType: BaseFieldDataType.PHONE_NUMBER,
					scope: BaseFieldScope.ORGANIZATION,
				});
				baseFieldWebsite = await createBaseField(null, {
					label: 'Fifty four seventy one 5471',
					shortCode: 'fifty_four_seventy_one',
					description: 'Five thousand four hundred seventy one.',
					dataType: BaseFieldDataType.URL,
					scope: BaseFieldScope.ORGANIZATION,
				});
				firstChangemaker = await createChangemaker(null, {
					name: 'Five thousand one hundred forty seven reasons',
					taxId: '05119',
					keycloakOrganizationId: null,
				});
				secondChangemaker = await createChangemaker(null, {
					taxId: '5387',
					name: 'Changemaker 5387',
					keycloakOrganizationId: '8b15d276-be48-11ef-a061-5b4a50e82d50',
				});
				secondChangemakerSourceId = (
					await createSource(null, {
						changemakerId: secondChangemaker.id,
						label: `${secondChangemaker.name} source`,
					})
				).id;
				firstFunder = await createOrUpdateFunder(null, {
					shortCode: 'funder_5393',
					name: 'Funder 5393',
					keycloakOrganizationId: null,
				});
				firstFunderOpportunity = await createOpportunity(null, {
					title: `${firstFunder.name} opportunity`,
				});
				firstFunderSourceId = (
					await createSource(null, {
						funderShortCode: firstFunder.shortCode,
						label: `${firstFunder.name} source`,
					})
				).id;
				firstDataProvider = await createOrUpdateDataProvider(null, {
					shortCode: 'data_provider_5431',
					name: 'Data Platform Provider 5431',
					keycloakOrganizationId: null,
				});
				secondDataProvider = await createOrUpdateDataProvider(null, {
					shortCode: 'data_provider_5477',
					name: 'Data Platform Provider 5477',
					keycloakOrganizationId: null,
				});
				firstDataProviderSourceId = (
					await createSource(null, {
						dataProviderShortCode: firstDataProvider.shortCode,
						label: `${firstDataProvider.name} source`,
					})
				).id;
				secondDataProviderSourceId = (
					await createSource(null, {
						dataProviderShortCode: secondDataProvider.shortCode,
						label: `${secondDataProvider.name} source`,
					})
				).id;
			});

			it('returns the latest valid value for a base field when auth id is sent', async () => {
				// Associate a base field associated with one opportunity/org, and add three responses.
				const baseFieldId = baseFieldEmail.id;
				const changemakerId = firstChangemaker.id;
				const opportunityId = firstFunderOpportunity.id;
				const proposalId = (
					await createProposal(null, {
						opportunityId,
						externalId: 'Proposal',
						createdBy: systemUser.keycloakUserId,
					})
				).id;
				await createChangemakerProposal(null, {
					changemakerId,
					proposalId,
				});
				// I need 3 application form fields here. May as well make them use distinct forms too.
				const applicationFormIdEarliest = (
					await createApplicationForm(null, {
						opportunityId,
					})
				).id;
				// Older field that is valid
				await createProposalFieldValue(null, {
					proposalVersionId: (
						await createProposalVersion(null, {
							proposalId,
							applicationFormId: applicationFormIdEarliest,
							sourceId: systemSource.id,
							createdBy: systemUser.keycloakUserId,
						})
					).id,
					applicationFormFieldId: (
						await createApplicationFormField(null, {
							label: 'Org email',
							applicationFormId: applicationFormIdEarliest,
							baseFieldId,
							position: 5279,
						})
					).id,
					position: 5297,
					value: 'validbutold@emailaddress.com',
					isValid: true,
				});
				const applicationFormIdLatestValid = (
					await createApplicationForm(null, {
						opportunityId,
					})
				).id;
				const latestValidValue = await createProposalFieldValue(null, {
					proposalVersionId: (
						await createProposalVersion(null, {
							proposalId,
							applicationFormId: applicationFormIdLatestValid,
							sourceId: systemSource.id,
							createdBy: systemUser.keycloakUserId,
						})
					).id,
					applicationFormFieldId: (
						await createApplicationFormField(null, {
							label: 'Email contact',
							applicationFormId: applicationFormIdLatestValid,
							baseFieldId,
							position: 5347,
						})
					).id,
					position: 5381,
					value: 'valid@emailaddress.com',
					isValid: true,
				});
				const applicationFormIdLatest = (
					await createApplicationForm(null, {
						opportunityId,
					})
				).id;
				// Latest value but invalid
				await createProposalFieldValue(null, {
					proposalVersionId: (
						await createProposalVersion(null, {
							proposalId,
							applicationFormId: applicationFormIdLatest,
							sourceId: systemSource.id,
							createdBy: systemUser.keycloakUserId,
						})
					).id,
					applicationFormFieldId: (
						await createApplicationFormField(null, {
							label: 'Contact email address',
							applicationFormId: applicationFormIdLatest,
							baseFieldId,
							position: 5209,
						})
					).id,
					position: 5231,
					value: 'invalid-email-address.com',
					isValid: false,
				});
				await request(app)
					.get(`/changemakers/${changemakerId}`)
					.set(authHeader)
					.expect(200)
					.expect((res) =>
						expect(res.body).toEqual({
							id: changemakerId,
							name: 'Five thousand one hundred forty seven reasons',
							taxId: '05119',
							keycloakOrganizationId: null,
							createdAt: expectTimestamp,
							fields: [latestValidValue],
						}),
					);
			});

			it('returns older changemaker data when newer funder data is present', async () => {
				// Set up changemaker and funder sources.
				const changemaker = secondChangemaker;
				const changemakerSourceId = secondChangemakerSourceId;
				const funderSourceId = firstFunderSourceId;
				// Associate one opportunity, one changemaker, and two responses with a base field.
				const baseFieldId = baseFieldPhone.id;
				const opportunity = firstFunderOpportunity;
				const proposalId = (
					await createProposal(null, {
						opportunityId: opportunity.id,
						externalId: `Proposal to ${opportunity.title}`,
						createdBy: systemUser.keycloakUserId,
					})
				).id;
				await createChangemakerProposal(null, {
					changemakerId: changemaker.id,
					proposalId,
				});
				const applicationFormIdChangemakerEarliest = (
					await createApplicationForm(null, {
						opportunityId: opportunity.id,
					})
				).id;
				// Set up older field value that is from the changemaker. We'll expect this to be returned.
				const changemakerEarliestValue = await createProposalFieldValue(null, {
					proposalVersionId: (
						await createProposalVersion(null, {
							proposalId,
							applicationFormId: applicationFormIdChangemakerEarliest,
							sourceId: changemakerSourceId,
							createdBy: systemUser.keycloakUserId,
						})
					).id,
					applicationFormFieldId: (
						await createApplicationFormField(null, {
							label: 'Org phone',
							applicationFormId: applicationFormIdChangemakerEarliest,
							baseFieldId,
							position: 5407,
						})
					).id,
					position: 5413,
					value: '+15555555555',
					isValid: true,
				});
				const applicationFormIdFunderLatest = (
					await createApplicationForm(null, {
						opportunityId: opportunity.id,
					})
				).id;
				// Set up newer field value that is from the funder.
				await createProposalFieldValue(null, {
					proposalVersionId: (
						await createProposalVersion(null, {
							proposalId,
							applicationFormId: applicationFormIdFunderLatest,
							sourceId: funderSourceId,
							createdBy: systemUser.keycloakUserId,
						})
					).id,
					applicationFormFieldId: (
						await createApplicationFormField(null, {
							label: 'Phone contact',
							applicationFormId: applicationFormIdFunderLatest,
							baseFieldId,
							position: 5417,
						})
					).id,
					position: 5419,
					value: '+16666666666',
					isValid: true,
				});
				await request(app)
					.get(`/changemakers/${changemaker.id}`)
					.set(authHeader)
					.expect(200)
					.expect((res) =>
						expect(res.body).toEqual({
							...changemaker,
							createdAt: expectTimestamp,
							fields: [changemakerEarliestValue],
						}),
					);
			});

			it('returns older funder data when newer data platform provider data is present', async () => {
				// Set up funder and data platform provider sources.
				const changemaker = secondChangemaker;
				const funderSourceId = firstFunderSourceId;
				const dataProviderSourceId = firstDataProviderSourceId;
				// Associate one opportunity, one changemaker, and two responses with a base field.
				const baseFieldId = baseFieldPhone.id;
				const opportunity = firstFunderOpportunity;
				const proposalId = (
					await createProposal(null, {
						opportunityId: opportunity.id,
						externalId: `Another proposal to ${opportunity.title}`,
						createdBy: systemUser.keycloakUserId,
					})
				).id;
				await createChangemakerProposal(null, {
					changemakerId: changemaker.id,
					proposalId,
				});
				const applicationFormIdFunderEarliest = (
					await createApplicationForm(null, {
						opportunityId: opportunity.id,
					})
				).id;
				// Set up older field value that is from the funder. We'll expect this to be returned.
				const funderEarliestValue = await createProposalFieldValue(null, {
					proposalVersionId: (
						await createProposalVersion(null, {
							proposalId,
							applicationFormId: applicationFormIdFunderEarliest,
							sourceId: funderSourceId,
							createdBy: systemUser.keycloakUserId,
						})
					).id,
					applicationFormFieldId: (
						await createApplicationFormField(null, {
							label: 'Organization phone 5437',
							applicationFormId: applicationFormIdFunderEarliest,
							baseFieldId,
							position: 5437,
						})
					).id,
					position: 5441,
					value: '+15555555441',
					isValid: true,
				});
				const applicationFormIdDataProviderLatest = (
					await createApplicationForm(null, {
						opportunityId: opportunity.id,
					})
				).id;
				// Set up newer field value that is from the data platform provider.
				await createProposalFieldValue(null, {
					proposalVersionId: (
						await createProposalVersion(null, {
							proposalId,
							applicationFormId: applicationFormIdDataProviderLatest,
							sourceId: dataProviderSourceId,
							createdBy: systemUser.keycloakUserId,
						})
					).id,
					applicationFormFieldId: (
						await createApplicationFormField(null, {
							label: 'Phone contact',
							applicationFormId: applicationFormIdDataProviderLatest,
							baseFieldId,
							position: 5443,
						})
					).id,
					position: 5449,
					value: '+16666665449',
					isValid: true,
				});
				await request(app)
					.get(`/changemakers/${changemaker.id}`)
					.set(authHeader)
					.expect(200)
					.expect((res) =>
						expect(res.body).toEqual({
							...changemaker,
							createdAt: expectTimestamp,
							fields: [funderEarliestValue],
						}),
					);
			});

			it('returns newer data when only data platform provider data is present', async () => {
				const changemaker = secondChangemaker;
				// Set up data platform provider sources.
				// Associate one opportunity, one changemaker, and two responses with a base field.
				const proposalId = (
					await createProposal(null, {
						opportunityId: firstFunderOpportunity.id,
						externalId: `Yet another proposal to ${firstFunderOpportunity.title}`,
						createdBy: systemUser.keycloakUserId,
					})
				).id;
				await createChangemakerProposal(null, {
					changemakerId: changemaker.id,
					proposalId,
				});
				const applicationFormIdDataProviderEarliest = (
					await createApplicationForm(null, {
						opportunityId: firstFunderOpportunity.id,
					})
				).id;
				// Set up older field value.
				await createProposalFieldValue(null, {
					proposalVersionId: (
						await createProposalVersion(null, {
							proposalId,
							applicationFormId: applicationFormIdDataProviderEarliest,
							sourceId: firstDataProviderSourceId,
							createdBy: systemUser.keycloakUserId,
						})
					).id,
					applicationFormFieldId: (
						await createApplicationFormField(null, {
							label: 'Organization website 5479',
							applicationFormId: applicationFormIdDataProviderEarliest,
							baseFieldId: baseFieldWebsite.id,
							position: 5479,
						})
					).id,
					position: 5483,
					value: '+15555555483',
					isValid: true,
				});
				const applicationFormIdDataProviderLatest = (
					await createApplicationForm(null, {
						opportunityId: firstFunderOpportunity.id,
					})
				).id;
				// Set up newer field value.
				const dataProviderNewestValue = await createProposalFieldValue(null, {
					proposalVersionId: (
						await createProposalVersion(null, {
							proposalId,
							applicationFormId: applicationFormIdDataProviderLatest,
							sourceId: secondDataProviderSourceId,
							createdBy: systemUser.keycloakUserId,
						})
					).id,
					applicationFormFieldId: (
						await createApplicationFormField(null, {
							label: 'Phone contact',
							applicationFormId: applicationFormIdDataProviderLatest,
							baseFieldId: baseFieldWebsite.id,
							position: 5501,
						})
					).id,
					position: 5503,
					value: '+16666665503',
					isValid: true,
				});
				await request(app)
					.get(`/changemakers/${changemaker.id}`)
					.set(authHeader)
					.expect(200)
					.expect((res) =>
						expect(res.body).toEqual({
							...changemaker,
							createdAt: expectTimestamp,
							fields: [dataProviderNewestValue],
						}),
					);
			});
		});
	});

	describe('POST /', () => {
		it('requires authentication', async () => {
			await request(app).post('/changemakers').expect(401);
		});

		it('creates exactly one changemaker', async () => {
			const before = await loadTableMetrics('changemakers');
			const result = await request(app)
				.post('/changemakers')
				.type('application/json')
				.set(authHeader)
				.send({
					taxId: '11-1111111',
					name: 'Example Inc.',
					keycloakOrganizationId: null,
				})
				.expect(201);
			const after = await loadTableMetrics('changemakers');
			expect(before.count).toEqual(0);
			expect(result.body).toStrictEqual({
				id: 1,
				taxId: '11-1111111',
				name: 'Example Inc.',
				keycloakOrganizationId: null,
				createdAt: expectTimestamp,
				fields: [],
			});
			expect(after.count).toEqual(1);
		});

		it('returns 400 bad request when no taxId is sent', async () => {
			const result = await request(app)
				.post('/changemakers')
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
			const result = await request(app)
				.post('/changemakers')
				.type('application/json')
				.set(authHeader)
				.send({
					taxId: '11-1111111',
				})
				.expect(400);
			expect(result.body).toMatchObject({
				name: 'InputValidationError',
				details: expect.any(Array) as unknown[],
			});
		});

		it('returns 409 conflict when an existing EIN + name combination is submitted', async () => {
			await createChangemaker(null, {
				taxId: '11-1111111',
				name: 'Example Inc.',
				keycloakOrganizationId: null,
			});
			const result = await request(app)
				.post('/changemakers')
				.type('application/json')
				.set(authHeader)
				.send({
					taxId: '11-1111111',
					name: 'Example Inc.',
					keycloakOrganizationId: null,
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

	describe('Update keycloakOrganizationId', () => {
		it('Successfully sets a keycloakOrganizationId where previously null', async () => {
			const changemaker = await createChangemaker(null, {
				taxId: '4833091201209397622311990956044204588593',
				name: 'Changemaker 4833091201209397622311990956044204588593',
				keycloakOrganizationId: null,
			});
			const newOrganizationId = stringToKeycloakId(
				'64e6da25-a6ba-43ce-97ba-1c5958bcc7ae',
			);
			const result = await updateChangemaker(changemaker.id, newOrganizationId);
			expect(result).toStrictEqual({
				...changemaker,
				keycloakOrganizationId: newOrganizationId,
			});
		});

		it('Successfully sets a keycloakOrganizationId where previously non-null', async () => {
			const changemaker = await createChangemaker(null, {
				taxId: '1099594605318784561881495063299923285326',
				name: 'Changemaker 1099594605318784561881495063299923285326',
				keycloakOrganizationId: '7733cef4-8a08-4089-a699-9be1e5536733',
			});
			const newOrganizationId = stringToKeycloakId(
				'0a78a90b-b2fe-42d0-8c46-b5ce959d6f24',
			);
			const result = await updateChangemaker(changemaker.id, newOrganizationId);
			expect(result).toStrictEqual({
				...changemaker,
				keycloakOrganizationId: newOrganizationId,
			});
		});

		it('Throws NotFoundError when the changemaker id does not exist', async () => {
			const newOrganizationId = stringToKeycloakId(
				'1377aea8-0ef5-4e0f-8beb-a799a93e898b',
			);
			const result = updateChangemaker(65222406, newOrganizationId);
			await expect(async () => {
				await result;
			}).rejects.toThrowError(NotFoundError);
		});
	});
});
