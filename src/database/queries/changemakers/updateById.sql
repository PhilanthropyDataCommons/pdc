UPDATE changemakers
SET keycloak_organization_id = :keycloakOrganizationId
WHERE id = :changemakerId
RETURNING changemaker_to_json(changemakers) AS object;
