SELECT opportunity_to_json(opportunities) AS object
FROM opportunities
WHERE id = :id;
