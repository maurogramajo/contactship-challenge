CREATE TABLE "hubspot_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar(255) NOT NULL,
	"hubspot_portal_id" varchar(255) NOT NULL,
	"hubspot_user_email" varchar(255),
	"hubspot_hub_domain" varchar(255),
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"scopes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar(255) NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" varchar(255) PRIMARY KEY DEFAULT concat('org_', gen_random_uuid()) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL
);
--> statement-breakpoint
DROP INDEX "contacts_external_source_idx";--> statement-breakpoint
ALTER TABLE "hubspot_connections" ADD CONSTRAINT "hubspot_connections_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_refresh_tokens" ADD CONSTRAINT "organization_refresh_tokens_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "hubspot_connections_org_idx" ON "hubspot_connections" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hubspot_connections_portal_idx" ON "hubspot_connections" USING btree ("hubspot_portal_id");--> statement-breakpoint
CREATE INDEX "organization_refresh_tokens_org_idx" ON "organization_refresh_tokens" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "organization_refresh_tokens_hash_idx" ON "organization_refresh_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_email_idx" ON "organizations" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "contacts_external_source_org_idx" ON "contacts" USING btree ("organization_id","external_id","source");