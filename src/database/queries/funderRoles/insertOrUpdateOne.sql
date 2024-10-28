INSERT INTO funder_roles (
  funder_short_code,
  user_keycloak_user_id,
  access_type,
  created_by
) VALUES (
  :funderShortCode,
  :userKeycloakUserId,
  :accessType::access_type_t,
  :createdBy
)
ON CONFLICT (funder_short_code, user_keycloak_user_id, access_type)
DO NOTHING
RETURNING funder_role_to_json(funder_roles) AS "object";
