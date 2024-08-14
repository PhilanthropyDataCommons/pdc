INSERT INTO base_fields (
  default_label,
  default_description,
  short_code,
  data_type,
  scope
)
VALUES (
  :defaultLabel,
  :defaultDescription,
  :shortCode,
  :dataType,
  :scope
)
RETURNING base_field_to_json(base_fields) AS "object";
