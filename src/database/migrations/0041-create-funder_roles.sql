CREATE TABLE funder_roles (
  user_keycloak_user_id UUID NOT NULL,
  funder_short_code short_code_t NOT NULL,
  access_type access_type_t NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_keycloak_user_id, funder_short_code, access_type),
  FOREIGN KEY (created_by) REFERENCES users(keycloak_user_id) ON DELETE CASCADE,
  FOREIGN KEY (user_keycloak_user_id) REFERENCES users(keycloak_user_id) ON DELETE CASCADE,
  FOREIGN KEY (funder_short_code) REFERENCES funders(short_code) ON DELETE CASCADE
);
