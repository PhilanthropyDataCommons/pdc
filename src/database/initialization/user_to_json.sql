SELECT drop_function('user_to_json');

CREATE FUNCTION user_to_json("user" users)
RETURNS JSONB AS $$
DECLARE
  roles_json JSONB := NULL::JSONB;
  changemaker_roles_json JSONB := NULL::JSONB;
  funder_roles_json JSONB := NULL::JSONB;
  data_provider_roles_json JSONB := NULL::JSONB;
BEGIN
  changemaker_roles_json := (
    SELECT jsonb_object_agg(
      changemaker_role_maps.changemaker_id, changemaker_role_maps.role_map
    )
    FROM (
      SELECT changemaker_roles.changemaker_id, jsonb_object_agg(changemaker_roles.access_type, TRUE) AS role_map
      FROM changemaker_roles
      WHERE changemaker_roles.user_keycloak_user_id = "user".keycloak_user_id
      GROUP BY changemaker_roles.changemaker_id
    ) AS changemaker_role_maps
  );

  data_provider_roles_json := (
    SELECT jsonb_object_agg(
      data_provider_role_maps.data_provider_short_code, data_provider_role_maps.role_map
    )
    FROM (
      SELECT data_provider_roles.data_provider_short_code, jsonb_object_agg(data_provider_roles.access_type, TRUE) AS role_map
      FROM data_provider_roles
      WHERE data_provider_roles.user_keycloak_user_id = "user".keycloak_user_id
      GROUP BY data_provider_roles.data_provider_short_code
    ) AS data_provider_role_maps
  );

  funder_roles_json := (
    SELECT jsonb_object_agg(
      funder_role_maps.funder_short_code, funder_role_maps.role_map
    )
    FROM (
      SELECT funder_roles.funder_short_code, jsonb_object_agg(funder_roles.access_type, TRUE) AS role_map
      FROM funder_roles
      WHERE funder_roles.user_keycloak_user_id = "user".keycloak_user_id
      GROUP BY funder_roles.funder_short_code
    ) AS funder_role_maps
  );

  roles_json := jsonb_build_object(
    'changemaker', COALESCE(changemaker_roles_json, '{}'),
    'dataProvider', COALESCE(data_provider_roles_json, '{}'),
    'funder', COALESCE(funder_roles_json, '{}')
  );

  RETURN jsonb_build_object(
    'keycloakUserId', "user".keycloak_user_id,
    'roles', roles_json,
    'createdAt', "user".created_at
  );
END;
$$ LANGUAGE plpgsql;
