INSERT INTO data_provider_roles (
  data_provider_short_code,
  user_keycloak_user_id,
  access_type,
  created_by
) VALUES (
  :dataProviderShortCode,
  :userKeycloakUserId,
  :accessType::access_type_t,
  :createdBy
)
ON CONFLICT (data_provider_short_code, user_keycloak_user_id, access_type)
DO NOTHING
RETURNING data_provider_role_to_json(data_provider_roles) AS "object";
