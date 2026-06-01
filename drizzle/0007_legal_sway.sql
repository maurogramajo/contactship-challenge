CREATE EXTENSION IF NOT EXISTS "pg_trgm";--> statement-breakpoint
CREATE INDEX "calls_contact_call_time_idx" ON "calls" USING btree ("contact_id","call_time");--> statement-breakpoint
CREATE INDEX "comments_contact_created_idx" ON "comments" USING btree ("contact_id","created_at");--> statement-breakpoint
CREATE INDEX "contact_actionables_contact_created_idx" ON "contact_actionables" USING btree ("contact_id","created_at");--> statement-breakpoint
CREATE INDEX "contacts_org_created_idx" ON "contacts" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "contacts_org_phone_idx" ON "contacts" USING btree ("organization_id","phone_number");--> statement-breakpoint
CREATE INDEX "contacts_org_lifecycle_stage_idx" ON "contacts" USING btree ("organization_id","external_lifecycle_stage");--> statement-breakpoint
CREATE INDEX "contacts_org_lead_status_idx" ON "contacts" USING btree ("organization_id","external_lead_status");--> statement-breakpoint
CREATE INDEX "contacts_org_normalized_email_idx" ON "contacts" USING btree ("organization_id",lower(trim("email")));--> statement-breakpoint
CREATE INDEX "contacts_org_normalized_phone_idx" ON "contacts" USING btree ("organization_id",regexp_replace(coalesce("phone_number", ''), '[^0-9]+', '', 'g'));--> statement-breakpoint
CREATE INDEX "contacts_full_name_trgm_idx" ON "contacts" USING gin ("full_name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "contacts_email_trgm_idx" ON "contacts" USING gin ("email" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "contacts_phone_trgm_idx" ON "contacts" USING gin ("phone_number" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "sync_tasks_status_created_idx" ON "sync_tasks" USING btree ("status","created_at");
