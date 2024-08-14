CREATE OR REPLACE FUNCTION base_field_to_json(base_field base_fields)
RETURNS JSONB AS $$
DECLARE
  localizations JSONB;
BEGIN
  localizations := (
    SELECT jsonb_object_agg(
      loc.language, base_field_localization_to_json(loc)
    )
    FROM base_field_localizations loc
    WHERE loc.base_field_id = base_field.id
  );

  RETURN jsonb_build_object(
    'id', base_field.id,
    'defaultLabel', base_field.default_label,
    'defaultDescription', base_field.default_description,
    'shortCode', base_field.short_code,
    'dataType', base_field.data_type,
    'scope', base_field.scope,
    'createdAt', to_json(base_field.created_at)::jsonb,
    'localizations', COALESCE(localizations, '{}')
  );
END;
$$ LANGUAGE plpgsql;
