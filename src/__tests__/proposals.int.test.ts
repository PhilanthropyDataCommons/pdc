import request from 'supertest';
import { TinyPgError } from 'tinypg';
import { app } from '../app';
import {
  db,
  loadTableMetrics,
} from '../database';
import { getLogger } from '../logger';
import { expectTimestamp } from '../test/utils';
import { mockJwt as authHeader } from '../test/mockJwt';
import { PostgresErrorCode } from '../types/PostgresErrorCode';
import type { Result } from 'tinypg';

const logger = getLogger(__filename);
const agent = request.agent(app);

describe('/proposals', () => {
  describe('GET /', () => {
    logger.debug('Now running an proposals test');
    it('returns an empty Bundle when no data is present', async () => {
      await agent
        .get('/proposals')
        .set(authHeader)
        .expect(200, {
          total: 0,
          entries: [],
        });
    });

    it('returns proposals present in the database', async () => {
      await db.sql('opportunities.insertOne', {
        title: '🔥',
      });
      await db.sql('applicants.insertOne', {
        externalId: '12345',
        optedIn: true,
      });
      await db.sql('canonicalFields.insertOne', {
        label: 'Summary',
        shortCode: 'summary',
        dataType: 'string',
      });
      await db.sql('proposals.insertOne', {
        applicantId: 1,
        externalId: 'proposal-1',
        opportunityId: 1,
      });
      await db.sql('proposals.insertOne', {
        applicantId: 1,
        externalId: 'proposal-2',
        opportunityId: 1,
      });
      await db.sql('applicationForms.insertOne', {
        opportunityId: 1,
      });
      await db.sql('proposalVersions.insertOne', {
        proposalId: 1,
        applicationFormId: 1,
      });
      await db.sql('applicationFormFields.insertOne', {
        applicationFormId: 1,
        canonicalFieldId: 1,
        position: 1,
        label: 'Short summary',
      });
      await db.sql('proposalFieldValues.insertOne', {
        proposalVersionId: 1,
        applicationFormFieldId: 1,
        position: 1,
        value: 'This is a summary',
      });

      await agent
        .get('/proposals')
        .set(authHeader)
        .expect(200)
        .expect(
          (res) => expect(res.body).toEqual(
            {
              total: 2,
              entries: [
                {
                  id: 2,
                  externalId: 'proposal-2',
                  applicantId: 1,
                  opportunityId: 1,
                  createdAt: expectTimestamp,
                  versions: [],
                },
                {
                  id: 1,
                  externalId: 'proposal-1',
                  applicantId: 1,
                  opportunityId: 1,
                  createdAt: expectTimestamp,
                  versions: [{
                    id: 1,
                    proposalId: 1,
                    version: 1,
                    applicationFormId: 1,
                    createdAt: expectTimestamp,
                    fieldValues: [{
                      id: 1,
                      applicationFormFieldId: 1,
                      proposalVersionId: 1,
                      position: 1,
                      value: 'This is a summary',
                      createdAt: expectTimestamp,
                      applicationFormField: {
                        id: 1,
                        applicationFormId: 1,
                        canonicalFieldId: 1,
                        label: 'Short summary',
                        position: 1,
                        createdAt: expectTimestamp,
                      },
                    }],
                  }],
                },
              ],
            },
          ),
        );
    });

    it('returns a subset of proposals present in the database when search is provided', async () => {
      await db.sql('opportunities.insertOne', {
        title: '🔥',
      });
      await db.sql('applicants.insertOne', {
        externalId: '12345',
        optedIn: true,
      });
      await db.sql('canonicalFields.insertOne', {
        label: 'Summary',
        shortCode: 'summary',
        dataType: 'string',
      });
      await db.sql('proposals.insertOne', {
        applicantId: 1,
        externalId: 'proposal-1',
        opportunityId: 1,
      });
      await db.sql('proposals.insertOne', {
        applicantId: 1,
        externalId: 'proposal-2',
        opportunityId: 1,
      });
      await db.sql('applicationForms.insertOne', {
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
      await db.sql('applicationFormFields.insertOne', {
        applicationFormId: 1,
        canonicalFieldId: 1,
        position: 1,
        label: 'Short summary',
      });
      await db.sql('proposalFieldValues.insertOne', {
        proposalVersionId: 1,
        applicationFormFieldId: 1,
        position: 1,
        value: 'This is a summary',
      });
      await db.sql('proposalFieldValues.insertOne', {
        proposalVersionId: 2,
        applicationFormFieldId: 1,
        position: 1,
        value: 'This is a pair of pants',
      });
      await agent
        .get('/proposals?_content=summary')
        .set(authHeader)
        .expect(200)
        .expect(
          (res) => expect(res.body).toEqual(
            {
              total: 2,
              entries: [
                {
                  id: 1,
                  externalId: 'proposal-1',
                  applicantId: 1,
                  opportunityId: 1,
                  createdAt: expectTimestamp,
                  versions: [{
                    id: 1,
                    proposalId: 1,
                    version: 1,
                    applicationFormId: 1,
                    createdAt: expectTimestamp,
                    fieldValues: [{
                      id: 1,
                      applicationFormFieldId: 1,
                      proposalVersionId: 1,
                      position: 1,
                      value: 'This is a summary',
                      createdAt: expectTimestamp,
                      applicationFormField: {
                        id: 1,
                        applicationFormId: 1,
                        canonicalFieldId: 1,
                        label: 'Short summary',
                        position: 1,
                        createdAt: expectTimestamp,
                      },
                    }],
                  }],
                },
              ],
            },
          ),
        );
    });

    it('returns a subset of proposals present in the database when search is provided - tscfg simple', async () => {
      // This should pass even if the default text search config is 'simple'.
      // See https://github.com/PhilanthropyDataCommons/service/issues/336
      await db.query('set default_text_search_config = \'simple\';');
      await db.sql('opportunities.insertOne', {
        title: 'Grand opportunity',
      });
      await db.sql('applicants.insertOne', {
        externalId: '4993',
        optedIn: true,
      });
      await db.sql('canonicalFields.insertOne', {
        label: 'Summary',
        shortCode: 'summary',
        dataType: 'string',
      });
      await db.sql('proposals.insertOne', {
        applicantId: 1,
        externalId: 'proposal-4999',
        opportunityId: 1,
      });
      await db.sql('proposals.insertOne', {
        applicantId: 1,
        externalId: 'proposal-5003',
        opportunityId: 1,
      });
      await db.sql('applicationForms.insertOne', {
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
      await db.sql('applicationFormFields.insertOne', {
        applicationFormId: 1,
        canonicalFieldId: 1,
        position: 1,
        label: 'Concise summary',
      });
      await db.sql('proposalFieldValues.insertOne', {
        proposalVersionId: 1,
        applicationFormFieldId: 1,
        position: 1,
        value: 'This is a summary',
      });
      await db.sql('proposalFieldValues.insertOne', {
        proposalVersionId: 2,
        applicationFormFieldId: 1,
        position: 1,
        value: 'This is a pair of pants',
      });
      await agent
        .get('/proposals?_content=summary')
        .set(authHeader)
        .expect(200)
        .expect(
          (res) => expect(res.body).toEqual(
            {
              total: 2,
              entries: [
                {
                  id: 1,
                  externalId: 'proposal-4999',
                  applicantId: 1,
                  opportunityId: 1,
                  createdAt: expectTimestamp,
                  versions: [{
                    id: 1,
                    proposalId: 1,
                    version: 1,
                    applicationFormId: 1,
                    createdAt: expectTimestamp,
                    fieldValues: [{
                      id: 1,
                      applicationFormFieldId: 1,
                      proposalVersionId: 1,
                      position: 1,
                      value: 'This is a summary',
                      createdAt: expectTimestamp,
                      applicationFormField: {
                        id: 1,
                        applicationFormId: 1,
                        canonicalFieldId: 1,
                        label: 'Concise summary',
                        position: 1,
                        createdAt: expectTimestamp,
                      },
                    }],
                  }],
                },
              ],
            },
          ),
        );
    });

    it('returns according to pagination parameters', async () => {
      await db.sql('opportunities.insertOne', {
        title: '🔥',
      });
      await db.sql('applicants.insertOne', {
        externalId: '12345',
        optedIn: 'true',
      });
      await Array.from(Array(20)).reduce(async (p, _, i) => {
        await p;
        await db.sql('proposals.insertOne', {
          applicantId: 1,
          externalId: `proposal-${i + 1}`,
          opportunityId: 1,
        });
      }, Promise.resolve());
      await agent
        .get('/proposals')
        .query({
          _page: 2,
          _count: 5,
        })
        .set(authHeader)
        .expect(200)
        .expect(
          (res) => expect(res.body).toEqual(
            {
              total: 20,
              entries: [
                {
                  id: 15,
                  externalId: 'proposal-15',
                  applicantId: 1,
                  opportunityId: 1,
                  versions: [],
                  createdAt: expectTimestamp,
                },
                {
                  id: 14,
                  externalId: 'proposal-14',
                  applicantId: 1,
                  opportunityId: 1,
                  versions: [],
                  createdAt: expectTimestamp,
                },
                {
                  id: 13,
                  externalId: 'proposal-13',
                  applicantId: 1,
                  opportunityId: 1,
                  versions: [],
                  createdAt: expectTimestamp,
                },
                {
                  id: 12,
                  externalId: 'proposal-12',
                  applicantId: 1,
                  opportunityId: 1,
                  versions: [],
                  createdAt: expectTimestamp,
                },
                {
                  id: 11,
                  externalId: 'proposal-11',
                  applicantId: 1,
                  opportunityId: 1,
                  versions: [],
                  createdAt: expectTimestamp,
                },
              ],
            },
          ),
        );
    });

    it('returns a subset of proposals for a given opportunityId', async () => {
      await db.sql('opportunities.insertOne', {
        title: 'First opportunity',
      });
      await db.sql('opportunities.insertOne', {
        title: 'Second opportunity',
      });
      await db.sql('opportunities.insertOne', {
        title: 'Third opportunity',
      });
      await db.sql('applicants.insertOne', {
        externalId: '5009',
        optedIn: true,
      });
      await db.sql('proposals.insertOne', {
        applicantId: 1,
        externalId: 'proposal-5011',
        opportunityId: 3,
      });
      await db.sql('proposals.insertOne', {
        applicantId: 1,
        externalId: 'proposal-5021',
        opportunityId: 1,
      });
      await db.sql('proposals.insertOne', {
        applicantId: 1,
        externalId: 'proposal-5023',
        opportunityId: 2,
      });
      await db.sql('proposals.insertOne', {
        applicantId: 1,
        externalId: 'proposal-5039',
        opportunityId: 2,
      });
      await agent
        .get('/proposals?opportunityId=2')
        .set(authHeader)
        .expect(200)
        .expect(
          (res) => expect(res.body).toEqual(
            {
              total: 4,
              entries: [
                {
                  id: 4,
                  externalId: 'proposal-5039',
                  applicantId: 1,
                  opportunityId: 2,
                  createdAt: expectTimestamp,
                  versions: [],
                },
                {
                  id: 3,
                  externalId: 'proposal-5023',
                  applicantId: 1,
                  opportunityId: 2,
                  createdAt: expectTimestamp,
                  versions: [],
                },
              ],
            },
          ),
        );
    });

    it('should throw an input validation error when given a non-integer opportunityId', async () => {
      const result = await agent
        .get('/proposals?opportunityId=thisIsNotAnIntegerYall')
        .set(authHeader)
        .expect(400);
      expect(result.body).toMatchObject({
        name: 'SimpleInputValidationError',
      });
    });

    it('should error if the database returns an unexpected data structure', async () => {
      jest.spyOn(db, 'query')
        .mockImplementationOnce(async () => ({
          rows: [{ foo: 'not a valid result' }],
        }) as Result<object>);
      const result = await agent
        .get('/proposals')
        .set(authHeader)
        .expect(500);
      expect(result.body).toMatchObject({
        name: 'InternalValidationError',
        details: expect.any(Array) as unknown[],
      });
    });

    it('returns 500 UnknownError if a generic Error is thrown when selecting', async () => {
      jest.spyOn(db, 'sql')
        .mockImplementationOnce(async () => {
          throw new Error('This is unexpected');
        });
      const result = await agent
        .get('/proposals')
        .set(authHeader)
        .expect(500);
      expect(result.body).toMatchObject({
        name: 'UnknownError',
        details: expect.any(Array) as unknown[],
      });
    });

    it('returns 503 DatabaseError if an insufficient resources database error is thrown when selecting', async () => {
      jest.spyOn(db, 'sql')
        .mockImplementationOnce(async () => {
          throw new TinyPgError(
            'Something went wrong',
            undefined,
            {
              error: {
                code: PostgresErrorCode.INSUFFICIENT_RESOURCES,
              },
            },
          );
        });
      const result = await agent
        .get('/proposals')
        .set(authHeader)
        .expect(503);
      expect(result.body).toMatchObject({
        name: 'DatabaseError',
        details: [{
          code: PostgresErrorCode.INSUFFICIENT_RESOURCES,
        }],
      });
    });
  });

  describe('GET /:id', () => {
    it('returns 404 when given id is not present', async () => {
      await agent
        .get('/proposals/9001')
        .set(authHeader)
        .expect(404, {
          name: 'NotFoundError',
          message: 'Not found. Find existing proposals by calling with no parameters.',
          details: [
            {
              name: 'NotFoundError',
            },
          ],
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
      await db.query(`
        INSERT INTO applicants (
          external_id,
          opted_in,
          created_at
        )
        VALUES
          ( '🐕', 'true', '2525-01-03T00:00:02Z' ),
          ( '🐈', 'false', '2525-01-03T00:00:03Z' );
      `);
      await db.query(`
        INSERT INTO proposals (
          applicant_id,
          external_id,
          opportunity_id,
          created_at
        )
        VALUES
          ( 1, 'proposal-1', 1, '2525-01-03T00:00:04Z' ),
          ( 1, 'proposal-2', 1, '2525-01-03T00:00:05Z' );
      `);
      await agent
        .get('/proposals/2')
        .set(authHeader)
        .expect(
          200,
          {
            id: 2,
            externalId: 'proposal-2',
            applicantId: 1,
            opportunityId: 1,
            createdAt: '2525-01-03T00:00:05.000Z',
          },
        );
    });

    it('returns one proposal with deep fields when includeFieldsAndValues=true', async () => {
      // Needs canonical fields,
      // opportunity,
      // an applicant,
      // application form,
      // application form fields,
      // proposal,
      // proposal versions, and
      // proposal field values.
      await db.query(`
        INSERT INTO canonical_fields (
          label,
          short_code,
          data_type,
          created_at
        )
        VALUES
          ( 'Summary', 'summary', '{ type: "string" }', '2023-01-06T16:22:00+0000' ),
          ( 'Title', 'title', '{ type: "string" }', '2023-01-06T16:24:00+0000' );
      `);
      await db.query(`
        INSERT INTO opportunities (
          title,
          created_at
        )
        VALUES
          ( '🌎', '2525-01-04T00:00:01Z' )
      `);
      await db.query(`
        INSERT INTO applicants (
          external_id,
          opted_in,
          created_at
        )
        VALUES
          ( '🐯', 'true', '2525-01-04T00:00:02Z' ),
          ( '🐅', 'false', '2525-01-04T00:00:03Z' );
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
          canonical_field_id,
          position,
          label,
          created_at
        )
        VALUES
          ( 1, 2, 1, 'Short summary or title', '2525-01-04T00:00:05Z' ),
          ( 1, 1, 2, 'Long summary or abstract', '2525-01-04T00:00:06Z' );
      `);
      await db.query(`
        INSERT INTO proposals (
          applicant_id,
          external_id,
          opportunity_id,
          created_at
        )
        VALUES
          ( 2, 'proposal-2525-01-04T00Z', 1, '2525-01-04T00:00:07Z' );
      `);
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
          created_at
        )
        VALUES
          ( 1, 1, 1, 'Title for version 1 from 2525-01-04', '2525-01-04T00:00:10Z' ),
          ( 1, 2, 2, 'Abstract for version 1 from 2525-01-04', '2525-01-04T00:00:11Z' ),
          ( 2, 1, 1, 'Title for version 2 from 2525-01-04', '2525-01-04T00:00:12Z' ),
          ( 2, 2, 2, 'Abstract for version 2 from 2525-01-04', '2525-01-04T00:00:13Z' );
      `);
      await agent
        .get('/proposals/1/?includeFieldsAndValues=true')
        .set(authHeader)
        .expect(
          200,
          {
            id: 1,
            applicantId: 2,
            opportunityId: 1,
            externalId: 'proposal-2525-01-04T00Z',
            createdAt: '2525-01-04T00:00:07.000Z',
            versions: [
              {
                id: 2,
                proposalId: 1,
                applicationFormId: 1,
                version: 2,
                createdAt: '2525-01-04T00:00:09.000Z',
                fieldValues: [
                  {
                    id: 3,
                    proposalVersionId: 2,
                    applicationFormFieldId: 1,
                    position: 1,
                    value: 'Title for version 2 from 2525-01-04',
                    createdAt: '2525-01-04T00:00:12.000Z',
                    applicationFormField: {
                      id: 1,
                      applicationFormId: 1,
                      canonicalFieldId: 2,
                      position: 1,
                      label: 'Short summary or title',
                      createdAt: '2525-01-04T00:00:05.000Z',
                    },
                  },
                  {
                    id: 4,
                    proposalVersionId: 2,
                    applicationFormFieldId: 2,
                    position: 2,
                    value: 'Abstract for version 2 from 2525-01-04',
                    createdAt: '2525-01-04T00:00:13.000Z',
                    applicationFormField: {
                      id: 2,
                      applicationFormId: 1,
                      canonicalFieldId: 1,
                      position: 2,
                      label: 'Long summary or abstract',
                      createdAt: '2525-01-04T00:00:06.000Z',
                    },
                  },
                ],
              },
              {
                id: 1,
                proposalId: 1,
                applicationFormId: 1,
                version: 1,
                createdAt: '2525-01-04T00:00:08.000Z',
                fieldValues: [
                  {
                    id: 1,
                    proposalVersionId: 1,
                    applicationFormFieldId: 1,
                    position: 1,
                    value: 'Title for version 1 from 2525-01-04',
                    createdAt: '2525-01-04T00:00:10.000Z',
                    applicationFormField: {
                      id: 1,
                      applicationFormId: 1,
                      canonicalFieldId: 2,
                      position: 1,
                      label: 'Short summary or title',
                      createdAt: '2525-01-04T00:00:05.000Z',
                    },
                  },
                  {
                    id: 2,
                    proposalVersionId: 1,
                    applicationFormFieldId: 2,
                    position: 2,
                    value: 'Abstract for version 1 from 2525-01-04',
                    createdAt: '2525-01-04T00:00:11.000Z',
                    applicationFormField: {
                      id: 2,
                      applicationFormId: 1,
                      canonicalFieldId: 1,
                      position: 2,
                      label: 'Long summary or abstract',
                      createdAt: '2525-01-04T00:00:06.000Z',
                    },
                  },
                ],
              },
            ],
          },
        );
    });

    it('should error if the database returns an unexpected data structure', async () => {
      jest.spyOn(db, 'sql')
        .mockImplementationOnce(async () => ({
          rows: [{ foo: 'not a valid result' }],
        }) as Result<object>);
      const result = await agent
        .get('/proposals/2')
        .set(authHeader)
        .expect(500);
      expect(result.body).toMatchObject({
        name: 'InternalValidationError',
        details: expect.any(Array) as unknown[],
      });
    });

    it('returns 500 UnknownError if a generic Error is thrown when selecting', async () => {
      jest.spyOn(db, 'sql')
        .mockImplementationOnce(async () => {
          throw new Error('This is unexpected');
        });
      const result = await agent
        .get('/proposals/2')
        .set(authHeader)
        .expect(500);
      expect(result.body).toMatchObject({
        name: 'UnknownError',
        details: expect.any(Array) as unknown[],
      });
    });

    it('returns 503 DatabaseError if an insufficient resources database error is thrown when selecting', async () => {
      jest.spyOn(db, 'sql')
        .mockImplementationOnce(async () => {
          throw new TinyPgError(
            'Something went wrong',
            undefined,
            {
              error: {
                code: PostgresErrorCode.INSUFFICIENT_RESOURCES,
              },
            },
          );
        });
      const result = await agent
        .get('/proposals/2')
        .set(authHeader)
        .expect(503);
      expect(result.body).toMatchObject({
        name: 'DatabaseError',
        details: [{
          code: PostgresErrorCode.INSUFFICIENT_RESOURCES,
        }],
      });
    });

    it('returns 404 when given id is not present and includeFieldsAndValues=true', async () => {
      await agent
        .get('/proposals/9002?includeFieldsAndValues=true')
        .set(authHeader)
        .expect(404, {
          name: 'NotFoundError',
          message: 'Not found. Find existing proposals by calling with no parameters.',
          details: [
            {
              name: 'NotFoundError',
            },
          ],
        });
    });

    it('should error if the database returns an unexpected data structure when includeFieldsAndValues=true', async () => {
      jest.spyOn(db, 'sql')
        .mockImplementationOnce(async () => ({
          rows: [{ foo: 'not a valid result' }],
        }) as Result<object>);
      const result = await agent
        .get('/proposals/9003?includeFieldsAndValues=true')
        .set(authHeader)
        .expect(500);
      expect(result.body).toMatchObject({
        name: 'InternalValidationError',
        details: expect.any(Array) as unknown[],
      });
    });

    it('returns 500 UnknownError if a generic Error is thrown when selecting and includeFieldsAndValues=true', async () => {
      jest.spyOn(db, 'sql')
        .mockImplementationOnce(async () => {
          throw new Error('This is unexpected');
        });
      const result = await agent
        .get('/proposals/9004?includeFieldsAndValues=true')
        .set(authHeader)
        .expect(500);
      expect(result.body).toMatchObject({
        name: 'UnknownError',
        details: expect.any(Array) as unknown[],
      });
    });

    it('returns 503 DatabaseError if db error is thrown when includeFieldsAndValues=true', async () => {
      await db.query(`
        INSERT INTO opportunities (
          title,
          created_at
        )
        VALUES
          ( '🧳', '2525-01-04T00:00:14Z' )
      `);
      await db.query(`
        INSERT INTO applicants (
          external_id,
          opted_in,
          created_at
        )
        VALUES
          ( '🐴', 'true', '2525-01-04T00:00:15Z' );
      `);
      await db.query(`
        INSERT INTO proposals (
          applicant_id,
          external_id,
          opportunity_id,
          created_at
        )
        VALUES
          ( 1, 'proposal-🧳-🐴', 1, '2525-01-04T00:00:16Z' );
      `);
      jest.spyOn(db, 'sql')
        .mockImplementationOnce(async () => {
          throw new TinyPgError(
            'Something went wrong',
            undefined,
            {
              error: {
                code: PostgresErrorCode.INSUFFICIENT_RESOURCES,
              },
            },
          );
        });
      const result = await agent
        .get('/proposals/1?includeFieldsAndValues=true')
        .type('application/json')
        .set(authHeader)
        .expect(503);
      expect(result.body).toMatchObject({
        name: 'DatabaseError',
        details: [{
          code: PostgresErrorCode.INSUFFICIENT_RESOURCES,
        }],
      });
    });

    it('should return 503 when the db has insufficient resources on proposal field values select', async () => {
      jest.spyOn(db, 'sql')
        .mockImplementationOnce(async () => ({
          command: '',
          row_count: 1,
          rows: [
            {
              id: 9005,
              applicantId: 9006,
              opportunityId: 9007,
              externalId: 'nine thousand eight',
              createdAt: new Date(),
            },
          ],
        }))
        .mockImplementationOnce(async () => {
          throw new TinyPgError(
            'Something went wrong',
            undefined,
            {
              error: {
                code: PostgresErrorCode.INSUFFICIENT_RESOURCES,
              },
            },
          );
        });
      const result = await agent
        .get('/proposals/9005')
        .query({ includeFieldsAndValues: 'true' })
        .set(authHeader)
        .expect(503);
      expect(result.body).toMatchObject({
        name: 'DatabaseError',
        details: [{
          code: PostgresErrorCode.INSUFFICIENT_RESOURCES,
        }],
      });
    });
  });

  describe('POST /', () => {
    it('creates exactly one proposal', async () => {
      await db.query(`
        INSERT INTO opportunities (
          title,
          created_at
        )
        VALUES
          ( '🔥', '2525-01-02T00:00:01Z' )
      `);
      await db.query(`
        INSERT INTO applicants (
          external_id,
          opted_in,
          created_at
        )
        VALUES
          ( '12345', 'true', '2022-07-20 12:00:00+0000' ),
          ( '67890', 'false', '2022-07-20 12:00:00+0000' );
      `);
      const before = await loadTableMetrics('proposals');
      logger.debug('before: %o', before);
      const result = await agent
        .post('/proposals')
        .type('application/json')
        .set(authHeader)
        .send({
          applicantId: 1,
          externalId: 'proposal123',
          opportunityId: 1,
        })
        .expect(201);
      const after = await loadTableMetrics('proposals');
      logger.debug('after: %o', after);
      expect(before.count).toEqual(0);
      expect(result.body).toMatchObject({
        id: 1,
        applicantId: 1,
        externalId: 'proposal123',
        opportunityId: 1,
        createdAt: expectTimestamp,
      });
      expect(after.count).toEqual(1);
    });

    it('returns 400 bad request when no applicant ID is sent', async () => {
      const result = await agent
        .post('/proposals')
        .type('application/json')
        .set(authHeader)
        .send({
          externalId: 'proposal123',
          opportunityId: 1,
        })
        .expect(400);
      expect(result.body).toMatchObject({
        name: 'InputValidationError',
        details: expect.any(Array) as unknown[],
      });
    });

    it('returns 400 bad request when no external ID is sent', async () => {
      const result = await agent
        .post('/proposals')
        .type('application/json')
        .set(authHeader)
        .send({
          applicantId: 1,
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
          applicantId: 1,
          externalId: 'proposal123',
        })
        .expect(400);
      expect(result.body).toMatchObject({
        name: 'InputValidationError',
        details: expect.any(Array) as unknown[],
      });
    });

    it('returns 409 conflict when a non-existent applicant id is provided', async () => {
      await db.query(`
        INSERT INTO opportunities (
          title,
          created_at
        )
        VALUES
          ( '🔥', '2525-01-02T00:00:01Z' )
      `);
      const result = await agent
        .post('/proposals')
        .type('application/json')
        .set(authHeader)
        .send({
          applicantId: 1,
          externalId: 'proposal123',
          opportunityId: 1,
        })
        .expect(409);
      expect(result.body).toMatchObject({
        name: 'DatabaseError',
        details: [{
          code: PostgresErrorCode.FOREIGN_KEY_VIOLATION,
          constraint: 'fk_applicant',
        }],
      });
    });

    it('returns 409 conflict when a non-existent opportunity id is provided', async () => {
      await db.query(`
        INSERT INTO applicants (
          external_id,
          opted_in,
          created_at
        )
        VALUES
          ( '12345', 'true', '2022-07-20 12:00:00+0000' ),
          ( '67890', 'false', '2022-07-20 12:00:00+0000' );
      `);
      const result = await agent
        .post('/proposals')
        .type('application/json')
        .set(authHeader)
        .send({
          applicantId: 1,
          externalId: 'proposal123',
          opportunityId: 1,
        })
        .expect(409);
      expect(result.body).toMatchObject({
        name: 'DatabaseError',
        details: [{
          code: PostgresErrorCode.FOREIGN_KEY_VIOLATION,
          constraint: 'fk_opportunity',
        }],
      });
    });

    it('returns 500 if the database returns an unexpected data structure', async () => {
      await db.query(`
        INSERT INTO opportunities (
          title,
          created_at
        )
        VALUES
          ( '🔥', '2525-01-02T00:00:01Z' )
      `);
      await db.query(`
        INSERT INTO applicants (
          external_id,
          opted_in,
          created_at
        )
        VALUES
          ( '12345', 'true', '2022-07-20 12:00:00+0000' ),
          ( '67890', 'false', '2022-07-20 12:00:00+0000' );
      `);
      jest.spyOn(db, 'sql')
        .mockImplementationOnce(async () => ({
          rows: [{ foo: 'not a valid result' }],
        }) as Result<object>);
      const result = await agent
        .post('/proposals')
        .type('application/json')
        .set(authHeader)
        .send({
          applicantId: 1,
          externalId: 'proposal123',
          opportunityId: 1,
        })
        .expect(500);
      expect(result.body).toMatchObject({
        name: 'InternalValidationError',
        details: expect.any(Array) as unknown[],
      });
    });

    it('returns 500 UnknownError if a generic Error is thrown when inserting', async () => {
      await db.query(`
        INSERT INTO opportunities (
          title,
          created_at
        )
        VALUES
          ( '🔥', '2525-01-02T00:00:01Z' )
      `);
      await db.query(`
        INSERT INTO applicants (
          external_id,
          opted_in,
          created_at
        )
        VALUES
          ( '12345', 'true', '2022-07-20 12:00:00+0000' ),
          ( '67890', 'false', '2022-07-20 12:00:00+0000' );
      `);
      jest.spyOn(db, 'sql')
        .mockImplementationOnce(async () => {
          throw new Error('This is unexpected');
        });
      const result = await agent
        .post('/proposals')
        .type('application/json')
        .set(authHeader)
        .send({
          applicantId: 1,
          externalId: 'proposal123',
          opportunityId: 1,
        })
        .expect(500);
      expect(result.body).toMatchObject({
        name: 'UnknownError',
        details: expect.any(Array) as unknown[],
      });
    });

    it('returns 503 DatabaseError if an insufficient resources database error is thrown when inserting', async () => {
      await db.query(`
        INSERT INTO opportunities (
          title,
          created_at
        )
        VALUES
          ( '🔥', '2525-01-02T00:00:01Z' )
      `);
      await db.query(`
        INSERT INTO applicants (
          external_id,
          opted_in,
          created_at
        )
        VALUES
          ( '12345', 'true', '2022-07-20 12:00:00+0000' ),
          ( '67890', 'false', '2022-07-20 12:00:00+0000' );
      `);
      jest.spyOn(db, 'sql')
        .mockImplementationOnce(async () => {
          throw new TinyPgError(
            'Something went wrong',
            undefined,
            {
              error: {
                code: PostgresErrorCode.INSUFFICIENT_RESOURCES,
              },
            },
          );
        });
      const result = await agent
        .post('/proposals')
        .type('application/json')
        .set(authHeader)
        .send({
          applicantId: 1,
          externalId: 'proposal123',
          opportunityId: 1,
        })
        .expect(503);
      expect(result.body).toMatchObject({
        name: 'DatabaseError',
        details: [{
          code: PostgresErrorCode.INSUFFICIENT_RESOURCES,
        }],
      });
    });
  });
});
