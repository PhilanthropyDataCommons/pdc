UPDATE base_fields SET
  default_label = :defaultLabel,
  default_description = :defaultDescription,
  short_code = :shortCode,
  data_type = :dataType,
  scope = :scope
WHERE id = :id
RETURNING base_field_to_json(base_fields) AS "object";
