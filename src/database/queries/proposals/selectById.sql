SELECT p.id AS "id",
  p.external_id AS "externalId",
  p.opportunity_id AS "opportunityId",
  p.created_at AS "createdAt"
FROM proposals p
WHERE p.id = :id;
