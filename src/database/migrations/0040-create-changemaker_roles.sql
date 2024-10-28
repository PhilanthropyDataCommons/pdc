CREATE TYPE access_type_t AS ENUM (
  'manage',
  'edit',
  'view'
);

CREATE TABLE changemaker_roles (
  user_keycloak_user_id UUID NOT NULL,
  changemaker_id INT NOT NULL,
  access_type access_type_t NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_keycloak_user_id, changemaker_id, access_type),
  FOREIGN KEY (created_by) REFERENCES users(keycloak_user_id) ON DELETE CASCADE,
  FOREIGN KEY (user_keycloak_user_id) REFERENCES users(keycloak_user_id) ON DELETE CASCADE,
  FOREIGN KEY (changemaker_id) REFERENCES changemakers(id) ON DELETE CASCADE
);
