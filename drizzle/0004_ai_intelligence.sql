BEGIN;

CREATE TABLE "organization_ai_settings" (
    "organization_id" varchar(255) NOT NULL,
    "objective" text NOT NULL,
    "additional_instructions" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "organization_ai_settings_organization_id_unique"
        UNIQUE ("organization_id"),
    CONSTRAINT "organization_ai_settings_organization_id_organizations_id_fk"
        FOREIGN KEY ("organization_id")
        REFERENCES "organizations" ("id")
        ON DELETE CASCADE
);

ALTER TABLE "contact_actionables"
    ADD COLUMN IF NOT EXISTS "organization_id" varchar(255);

ALTER TABLE "contact_actionables"
    ADD COLUMN IF NOT EXISTS "recommended_channel" varchar(255);

ALTER TABLE "contact_actionables"
    ADD COLUMN IF NOT EXISTS "recommended_action" text;

ALTER TABLE "contact_actionables"
    ADD COLUMN IF NOT EXISTS "draft_message" text;

ALTER TABLE "contact_actionables"
    ADD COLUMN IF NOT EXISTS "reasoning" text;

COMMIT;
