CREATE TYPE "public"."integration_log_status" AS ENUM('pending', 'success', 'failed');--> statement-breakpoint
CREATE TYPE "public"."integration_provider" AS ENUM('ai_provider', 'wecom', 'tencent_docs', 'system');--> statement-breakpoint
CREATE TYPE "public"."recruitment_event_source" AS ENUM('ai', 'manual', 'system', 'wecom', 'tencent_docs');--> statement-breakpoint
CREATE TYPE "public"."recruitment_event_status" AS ENUM('pending', 'confirmed', 'failed', 'ignored');--> statement-breakpoint
CREATE TYPE "public"."recruitment_event_type" AS ENUM('resume_parsed', 'recommendation_generated', 'hr_confirmed', 'candidate_created', 'application_created', 'feedback_parsed', 'status_changed', 'integration_synced', 'integration_failed');--> statement-breakpoint
CREATE TABLE "integration_log" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"provider" "integration_provider" NOT NULL,
	"operation" text NOT NULL,
	"status" "integration_log_status" DEFAULT 'pending' NOT NULL,
	"event_id" text,
	"external_id" text,
	"request_payload" jsonb,
	"response_payload" jsonb,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recruitment_event" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"type" "recruitment_event_type" NOT NULL,
	"status" "recruitment_event_status" DEFAULT 'pending' NOT NULL,
	"source" "recruitment_event_source" DEFAULT 'system' NOT NULL,
	"title" text,
	"candidate_id" text,
	"job_id" text,
	"application_id" text,
	"actor_id" text,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"confirmed_at" timestamp,
	"confirmed_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "integration_log" ADD CONSTRAINT "integration_log_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_log" ADD CONSTRAINT "integration_log_event_id_recruitment_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."recruitment_event"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recruitment_event" ADD CONSTRAINT "recruitment_event_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recruitment_event" ADD CONSTRAINT "recruitment_event_candidate_id_candidate_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidate"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recruitment_event" ADD CONSTRAINT "recruitment_event_job_id_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recruitment_event" ADD CONSTRAINT "recruitment_event_application_id_application_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."application"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recruitment_event" ADD CONSTRAINT "recruitment_event_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recruitment_event" ADD CONSTRAINT "recruitment_event_confirmed_by_id_user_id_fk" FOREIGN KEY ("confirmed_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "integration_log_organization_id_idx" ON "integration_log" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "integration_log_provider_idx" ON "integration_log" USING btree ("organization_id","provider");--> statement-breakpoint
CREATE INDEX "integration_log_status_idx" ON "integration_log" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "integration_log_event_id_idx" ON "integration_log" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "integration_log_created_at_idx" ON "integration_log" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "recruitment_event_organization_id_idx" ON "recruitment_event" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "recruitment_event_type_idx" ON "recruitment_event" USING btree ("organization_id","type");--> statement-breakpoint
CREATE INDEX "recruitment_event_status_idx" ON "recruitment_event" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "recruitment_event_candidate_id_idx" ON "recruitment_event" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX "recruitment_event_job_id_idx" ON "recruitment_event" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "recruitment_event_application_id_idx" ON "recruitment_event" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "recruitment_event_created_at_idx" ON "recruitment_event" USING btree ("organization_id","created_at");