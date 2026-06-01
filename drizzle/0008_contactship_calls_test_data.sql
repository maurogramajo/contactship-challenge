DROP INDEX IF EXISTS "calls_contact_call_time_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "calls_contact_start_idx";--> statement-breakpoint
DROP TABLE IF EXISTS "contact_tags";--> statement-breakpoint
DROP TABLE IF EXISTS "tags";--> statement-breakpoint
ALTER TABLE "calls" RENAME COLUMN "call_time" TO "start_at";--> statement-breakpoint
ALTER TABLE "calls" RENAME COLUMN "status" TO "call_result";--> statement-breakpoint
ALTER TABLE "calls" RENAME COLUMN "recording_url" TO "call_record";--> statement-breakpoint
ALTER TABLE "calls" RENAME COLUMN "user_id" TO "agent_id";--> statement-breakpoint
ALTER TABLE "calls" ADD COLUMN IF NOT EXISTS "from" varchar(255);--> statement-breakpoint
ALTER TABLE "calls" ADD COLUMN IF NOT EXISTS "call_status" varchar(255);--> statement-breakpoint
UPDATE "calls" SET "call_status" = 'completed' WHERE "call_status" IS NULL;--> statement-breakpoint
ALTER TABLE "calls" ALTER COLUMN "call_status" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "calls" ALTER COLUMN "call_result" TYPE varchar(255) USING "call_result"::text;--> statement-breakpoint
ALTER TABLE "calls" ADD COLUMN IF NOT EXISTS "disconnection_reason" varchar(255);--> statement-breakpoint
ALTER TABLE "calls" ADD COLUMN IF NOT EXISTS "finished_at" timestamp;--> statement-breakpoint
UPDATE "calls"
SET "finished_at" = "start_at" + make_interval(secs => coalesce("duration", 0))
WHERE "finished_at" IS NULL;--> statement-breakpoint
ALTER TABLE "calls" ADD COLUMN IF NOT EXISTS "call_analysis" jsonb;--> statement-breakpoint
UPDATE "calls"
SET "call_analysis" = jsonb_build_object('summary', "notes", 'sentiment', null)
WHERE "notes" IS NOT NULL AND "call_analysis" IS NULL;--> statement-breakpoint
ALTER TABLE "calls" DROP COLUMN IF EXISTS "notes";--> statement-breakpoint
ALTER TABLE "calls" ADD COLUMN IF NOT EXISTS "type" varchar(255) DEFAULT 'ai_call' NOT NULL;--> statement-breakpoint
ALTER TABLE "calls" ADD COLUMN IF NOT EXISTS "chat_history" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "calls" ADD COLUMN IF NOT EXISTS "transcript_format" varchar(50) DEFAULT 'json' NOT NULL;--> statement-breakpoint
CREATE INDEX "calls_contact_start_idx" ON "calls" USING btree ("contact_id","start_at");
