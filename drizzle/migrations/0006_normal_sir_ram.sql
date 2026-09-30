CREATE TABLE "analysis"."statement_vote_counts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_run_id" uuid NOT NULL,
	"statement_id" uuid NOT NULL,
	"group_id" uuid,
	"agree_count" integer DEFAULT 0 NOT NULL,
	"disagree_count" integer DEFAULT 0 NOT NULL,
	"pass_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "analysis"."statement_vote_counts" ADD CONSTRAINT "statement_vote_counts_analysis_run_id_runs_id_fk" FOREIGN KEY ("analysis_run_id") REFERENCES "analysis"."runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis"."statement_vote_counts" ADD CONSTRAINT "statement_vote_counts_statement_id_statements_id_fk" FOREIGN KEY ("statement_id") REFERENCES "core"."statements"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis"."statement_vote_counts" ADD CONSTRAINT "statement_vote_counts_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "analysis"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "analysis_statement_vote_counts_run_idx" ON "analysis"."statement_vote_counts" USING btree ("analysis_run_id");--> statement-breakpoint
CREATE INDEX "analysis_statement_vote_counts_statement_idx" ON "analysis"."statement_vote_counts" USING btree ("statement_id");