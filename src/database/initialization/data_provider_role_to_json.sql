SELECT drop_function('data_provider_role_to_json');

CREATE FUNCTION data_provider_role_to_json(data_provider_role data_provider_roles)
RETURNS JSONB AS $$
BEGIN
  RETURN jsonb_build_object(
    'userKeycloakUserId', data_provider_role.user_keycloak_user_id,
    'dataProviderShortCode', data_provider_role.data_provider_short_code,
    'accessType', data_provider_role.access_type,
    'createdBy', data_provider_role.created_by,
    'createdAt', data_provider_role.created_at
  );
END;
$$ LANGUAGE plpgsql;
