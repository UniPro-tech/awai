CREATE SCHEMA "analysis";
--> statement-breakpoint
CREATE SCHEMA "core";
--> statement-breakpoint
CREATE TYPE "analysis"."job_status" AS ENUM('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TYPE "analysis"."run_status" AS ENUM('RUNNING', 'COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TYPE "core"."author_visibility" AS ENUM('IDENTIFIED', 'ANONYMOUS');--> statement-breakpoint
CREATE TYPE "core"."statement_identity_policy" AS ENUM('OPTIONAL', 'ANONYMOUS_REQUIRED', 'IDENTIFIED_REQUIRED');--> statement-breakpoint
CREATE TYPE "core"."topic_status" AS ENUM('DRAFT', 'OPEN', 'CLOSED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "core"."user_role" AS ENUM('USER', 'ADMIN');--> statement-breakpoint
CREATE TYPE "core"."vote_value" AS ENUM('AGREE', 'DISAGREE', 'PASS');--> statement-breakpoint
CREATE TABLE "analysis"."groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_run_id" uuid NOT NULL,
	"ordinal" integer NOT NULL,
	"participant_count" integer NOT NULL,
	"centroid_x" real NOT NULL,
	"centroid_y" real NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analysis"."jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic_id" uuid NOT NULL,
	"status" "analysis"."job_status" DEFAULT 'PENDING' NOT NULL,
	"available_at" timestamp with time zone NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"locked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analysis"."points" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_run_id" uuid NOT NULL,
	"group_id" uuid,
	"x" real NOT NULL,
	"y" real NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analysis"."runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic_id" uuid NOT NULL,
	"job_id" uuid,
	"status" "analysis"."run_status" DEFAULT 'RUNNING' NOT NULL,
	"algorithm_version" varchar(100) NOT NULL,
	"participant_count" integer DEFAULT 0 NOT NULL,
	"statement_count" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analysis"."statement_results" (
	"analysis_run_id" uuid NOT NULL,
	"statement_id" uuid NOT NULL,
	"group_id" uuid,
	"kind" varchar(30) NOT NULL,
	"score" real NOT NULL,
	"rank" integer NOT NULL,
	CONSTRAINT "statement_results_analysis_run_id_statement_id_kind_pk" PRIMARY KEY("analysis_run_id","statement_id","kind")
);
--> statement-breakpoint
CREATE TABLE "core"."app_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" text NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"role" "core"."user_role" DEFAULT 'USER' NOT NULL,
	"suspended" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core"."audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid,
	"action" varchar(100) NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core"."categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core"."statements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic_id" uuid NOT NULL,
	"author_user_id" uuid NOT NULL,
	"body" text NOT NULL,
	"author_visibility" "core"."author_visibility" NOT NULL,
	"deleted_at" timestamp with time zone,
	"deleted_by_user_id" uuid,
	"deletion_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core"."tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(50) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core"."topic_tags" (
	"topic_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "topic_tags_topic_id_tag_id_pk" PRIMARY KEY("topic_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "core"."topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"author_visibility" "core"."author_visibility" DEFAULT 'IDENTIFIED' NOT NULL,
	"statement_identity_policy" "core"."statement_identity_policy" DEFAULT 'OPTIONAL' NOT NULL,
	"category_id" uuid,
	"status" "core"."topic_status" DEFAULT 'OPEN' NOT NULL,
	"deleted_at" timestamp with time zone,
	"deleted_by_user_id" uuid,
	"deletion_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core"."votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"statement_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"value" "core"."vote_value" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "analysis"."groups" ADD CONSTRAINT "groups_analysis_run_id_runs_id_fk" FOREIGN KEY ("analysis_run_id") REFERENCES "analysis"."runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis"."jobs" ADD CONSTRAINT "jobs_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "core"."topics"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis"."points" ADD CONSTRAINT "points_analysis_run_id_runs_id_fk" FOREIGN KEY ("analysis_run_id") REFERENCES "analysis"."runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis"."points" ADD CONSTRAINT "points_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "analysis"."groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis"."runs" ADD CONSTRAINT "runs_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "core"."topics"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis"."runs" ADD CONSTRAINT "runs_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "analysis"."jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis"."statement_results" ADD CONSTRAINT "statement_results_analysis_run_id_runs_id_fk" FOREIGN KEY ("analysis_run_id") REFERENCES "analysis"."runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis"."statement_results" ADD CONSTRAINT "statement_results_statement_id_statements_id_fk" FOREIGN KEY ("statement_id") REFERENCES "core"."statements"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis"."statement_results" ADD CONSTRAINT "statement_results_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "analysis"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_app_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "core"."app_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."statements" ADD CONSTRAINT "statements_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "core"."topics"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."statements" ADD CONSTRAINT "statements_author_user_id_app_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "core"."app_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."statements" ADD CONSTRAINT "statements_deleted_by_user_id_app_users_id_fk" FOREIGN KEY ("deleted_by_user_id") REFERENCES "core"."app_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."topic_tags" ADD CONSTRAINT "topic_tags_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "core"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."topic_tags" ADD CONSTRAINT "topic_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "core"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."topics" ADD CONSTRAINT "topics_created_by_user_id_app_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "core"."app_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."topics" ADD CONSTRAINT "topics_owner_user_id_app_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "core"."app_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."topics" ADD CONSTRAINT "topics_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "core"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."topics" ADD CONSTRAINT "topics_deleted_by_user_id_app_users_id_fk" FOREIGN KEY ("deleted_by_user_id") REFERENCES "core"."app_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."votes" ADD CONSTRAINT "votes_statement_id_statements_id_fk" FOREIGN KEY ("statement_id") REFERENCES "core"."statements"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."votes" ADD CONSTRAINT "votes_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "core"."app_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "analysis_groups_run_ordinal_unique" ON "analysis"."groups" USING btree ("analysis_run_id","ordinal");--> statement-breakpoint
CREATE INDEX "analysis_jobs_claim_idx" ON "analysis"."jobs" USING btree ("status","available_at");--> statement-breakpoint
CREATE INDEX "analysis_points_run_id_idx" ON "analysis"."points" USING btree ("analysis_run_id");--> statement-breakpoint
CREATE INDEX "analysis_runs_topic_created_at_idx" ON "analysis"."runs" USING btree ("topic_id","created_at");--> statement-breakpoint
CREATE INDEX "analysis_statement_results_group_idx" ON "analysis"."statement_results" USING btree ("group_id");--> statement-breakpoint
CREATE UNIQUE INDEX "app_users_auth_user_id_unique" ON "core"."app_users" USING btree ("auth_user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "core"."audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_name_unique" ON "core"."categories" USING btree ("name");--> statement-breakpoint
CREATE INDEX "statements_topic_created_at_idx" ON "core"."statements" USING btree ("topic_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_name_unique" ON "core"."tags" USING btree ("name");--> statement-breakpoint
CREATE INDEX "topics_status_created_at_idx" ON "core"."topics" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "topics_owner_user_id_idx" ON "core"."topics" USING btree ("owner_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "votes_statement_user_unique" ON "core"."votes" USING btree ("statement_id","user_id");--> statement-breakpoint
CREATE INDEX "votes_statement_id_idx" ON "core"."votes" USING btree ("statement_id");