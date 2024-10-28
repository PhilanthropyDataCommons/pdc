INSERT INTO changemaker_roles (
  changemaker_id,
  user_keycloak_user_id,
  access_type,
  created_by
) VALUES (
  :changemakerId,
  :userKeycloakUserId,
  :accessType::access_type_t,
  :createdBy
)
ON CONFLICT (changemaker_id, user_keycloak_user_id, access_type)
DO NOTHING
RETURNING changemaker_role_to_json(changemaker_roles) AS "object";
