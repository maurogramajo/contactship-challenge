BEGIN;

CREATE TEMP TABLE organization_id_migration AS
SELECT
  id AS old_id,
  substring(id from 5) AS new_id
FROM "organizations"
WHERE id LIKE 'org_%';

ALTER TABLE "hubspot_connections"
  DROP CONSTRAINT IF EXISTS "hubspot_connections_organization_id_organizations_id_fk";

ALTER TABLE "organization_refresh_tokens"
  DROP CONSTRAINT IF EXISTS "organization_refresh_tokens_organization_id_organizations_id_fk";

UPDATE "organizations" AS o
SET "id" = m.new_id
FROM organization_id_migration AS m
WHERE o.id = m.old_id;

UPDATE "hubspot_connections" AS hc
SET "organization_id" = m.new_id
FROM organization_id_migration AS m
WHERE hc.organization_id = m.old_id;

UPDATE "organization_refresh_tokens" AS ort
SET "organization_id" = m.new_id
FROM organization_id_migration AS m
WHERE ort.organization_id = m.old_id;

UPDATE "contacts" AS c
SET "organization_id" = m.new_id
FROM organization_id_migration AS m
WHERE c.organization_id = m.old_id;

UPDATE "calls" AS c
SET "organization_id" = m.new_id
FROM organization_id_migration AS m
WHERE c.organization_id = m.old_id;

UPDATE "comments" AS c
SET "organization_id" = m.new_id
FROM organization_id_migration AS m
WHERE c.organization_id = m.old_id;

ALTER TABLE "hubspot_connections"
  ADD CONSTRAINT "hubspot_connections_organization_id_organizations_id_fk"
  FOREIGN KEY ("organization_id")
  REFERENCES "public"."organizations"("id")
  ON DELETE no action
  ON UPDATE no action;

ALTER TABLE "organization_refresh_tokens"
  ADD CONSTRAINT "organization_refresh_tokens_organization_id_organizations_id_fk"
  FOREIGN KEY ("organization_id")
  REFERENCES "public"."organizations"("id")
  ON DELETE no action
  ON UPDATE no action;

DROP TABLE organization_id_migration;

COMMIT;
