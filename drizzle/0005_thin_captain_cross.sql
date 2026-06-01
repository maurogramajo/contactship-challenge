CREATE TYPE "public"."sync_task_status" AS ENUM('pending', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."sync_task_type" AS ENUM('create_contact', 'create_note', 'create_task', 'create_meeting');--> statement-breakpoint
CREATE TABLE "sync_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar(255) NOT NULL,
	"contact_id" uuid,
	"actionable_id" uuid,
	"action_id" varchar(255),
	"type" "sync_task_type" NOT NULL,
	"status" "sync_task_status" DEFAULT 'pending' NOT NULL,
	"payload" jsonb NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"executed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sync_tasks" ADD CONSTRAINT "sync_tasks_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_tasks" ADD CONSTRAINT "sync_tasks_actionable_id_contact_actionables_id_fk" FOREIGN KEY ("actionable_id") REFERENCES "public"."contact_actionables"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sync_tasks_org_status_created_idx" ON "sync_tasks" USING btree ("organization_id","status","created_at");--> statement-breakpoint
CREATE INDEX "sync_tasks_actionable_action_idx" ON "sync_tasks" USING btree ("actionable_id","action_id");--> statement-breakpoint
CREATE INDEX "sync_tasks_contact_type_idx" ON "sync_tasks" USING btree ("contact_id","type");
