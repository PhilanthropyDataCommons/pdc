SELECT drop_function('funder_role_to_json');

CREATE FUNCTION funder_role_to_json(funder_role funder_roles)
RETURNS JSONB AS $$
BEGIN
  RETURN jsonb_build_object(
    'userKeycloakUserId', funder_role.user_keycloak_user_id,
    'funderShortCode', funder_role.funder_short_code,
    'accessType', funder_role.access_type,
    'createdBy', funder_role.created_by,
    'createdAt', funder_role.created_at
  );
END;
$$ LANGUAGE plpgsql;
