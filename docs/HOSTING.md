# Hosting

## Keycloak

The PDC API requires a [Keycloak](https://www.keycloak.org/) instance
to handle authentication.

We suggest creating a second realm named `pdc`
to separate Keycloak administrator accounts from PDC accounts.

## service

The PDC API is a fairly standard Node.js application.
It needs no special operating system permissions,
and should be run as a non-root user.

Add the environment variables in `.env.example`
however your hosting environment needs.

Be sure to set `NODE_ENV=production`,
as recommended by the
[Node.js documentation](https://nodejs.org/en/learn/getting-started/nodejs-the-difference-between-development-and-production)
and the
[Express documentation](https://expressjs.com/en/advanced/best-practice-performance.html#set-node_env-to-production).

### DigitalOcean App Platform

The PDC API can be deployed on
[DigitalOcean App Platform](https://www.digitalocean.com/products/app-platform):

[![Deploy to DO](https://www.deploytodo.com/do-btn-blue.svg)](https://cloud.digitalocean.com/apps/new?repo=https://github.com/PhilanthropyDataCommons/service/tree/main)

Although specified in the template,
the API cannot be used with a DigitalOcean dev database,
because [dev databases do not allow schema
creation](https://www.digitalocean.com/community/questions/how-to-create-tables-with-app-platform-managed-dev-databases?comment=206323)
and the PDC requires PostgreSQL schemas;
the `migrate` job will fail with a permission denied error.
Either delete the dev database and add a prod database with the same name during app creation,
upgrade the generated dev database to a managed database after creating the app,
or delete the dev database and configure the environment variables with credentials for a database hosted elsewhere.
