SELECT proposal_to_json(p.*) as "object"
FROM proposals p
  LEFT JOIN proposal_versions pv ON pv.proposal_id = p.id
  LEFT JOIN proposal_field_values pfv on pfv.proposal_version_id = pv.id
  LEFT JOIN organizations_proposals op on op.proposal_id = p.id
WHERE
  CASE
    WHEN :createdBy != 0 THEN
      p.created_by = :createdBy
    ELSE
      true
    END
  AND CASE
    WHEN :search::text != '' THEN
      pfv.value_search @@ websearch_to_tsquery('english', :search::text)
    ELSE
      true
    END
  AND CASE
    WHEN :organizationId != 0 THEN
      op.organization_id = :organizationId
    ELSE
      true
    END
  AND CASE
    WHEN :userId != 0 THEN
      (
        p.created_by = :userId
        OR :isAdministrator
      )
    ELSE
      true
    END
GROUP BY p.id
ORDER BY p.id DESC
OFFSET :offset FETCH NEXT :limit ROWS ONLY;
