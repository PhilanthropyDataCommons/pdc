SELECT drop_function('changemaker_role_to_json');

CREATE FUNCTION changemaker_role_to_json(changemaker_role changemaker_roles)
RETURNS JSONB AS $$
BEGIN
  RETURN jsonb_build_object(
    'userKeycloakUserId', changemaker_role.user_keycloak_user_id,
    'changemakerId', changemaker_role.changemaker_id,
    'accessType', changemaker_role.access_type,
    'createdBy', changemaker_role.created_by,
    'createdAt', changemaker_role.created_at
  );
END;
$$ LANGUAGE plpgsql;
