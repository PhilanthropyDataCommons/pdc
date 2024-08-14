CREATE OR REPLACE FUNCTION base_field_localization_to_json(base_field_localization base_field_localizations)
RETURNS JSONB AS $$
BEGIN
  RETURN jsonb_build_object(
    'baseFieldId', base_field_localization.base_field_id,
    'language', base_field_localization.language,
    'label', base_field_localization.label,
    'description', base_field_localization.description,
    'createdAt', to_json(base_field_localization.created_at)::jsonb
  );
END;
$$ LANGUAGE plpgsql;
