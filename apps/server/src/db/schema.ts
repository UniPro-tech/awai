import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgSchema,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const core = pgSchema("core");
export const analysis = pgSchema("analysis");

export const userRole = core.enum("user_role", ["USER", "ADMIN"]);
export const topicStatus = core.enum("topic_status", ["DRAFT", "OPEN", "CLOSED", "ARCHIVED"]);
export const authorVisibility = core.enum("author_visibility", ["IDENTIFIED", "ANONYMOUS"]);
export const statementIdentityPolicy = core.enum("statement_identity_policy", [
  "OPTIONAL",
  "ANONYMOUS_REQUIRED",
  "IDENTIFIED_REQUIRED",
]);
export const voteValue = core.enum("vote_value", ["AGREE", "DISAGREE", "PASS"]);
export const analysisJobStatus = analysis.enum("job_status", [
  "PENDING",
  "RUNNING",
  "COMPLETED",
  "FAILED",
]);
export const analysisRunStatus = analysis.enum("run_status", ["RUNNING", "COMPLETED", "FAILED"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const appUsers = core.table(
  "app_users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authUserId: text("auth_user_id").notNull(),
    displayName: varchar("display_name", { length: 100 }).notNull(),
    role: userRole("role").default("USER").notNull(),
    suspended: boolean("suspended").default(false).notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex("app_users_auth_user_id_unique").on(table.authUserId)],
);

export const categories = core.table(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 100 }).notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex("categories_name_unique").on(table.name)],
);

export const tags = core.table(
  "tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 50 }).notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex("tags_name_unique").on(table.name)],
);

export const topics = core.table(
  "topics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdByUserId: uuid("created_by_user_id").notNull().references(() => appUsers.id, { onDelete: "restrict" }),
    ownerUserId: uuid("owner_user_id").notNull().references(() => appUsers.id, { onDelete: "restrict" }),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description").default("").notNull(),
    authorVisibility: authorVisibility("author_visibility").default("IDENTIFIED").notNull(),
    statementIdentityPolicy: statementIdentityPolicy("statement_identity_policy").default("OPTIONAL").notNull(),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    status: topicStatus("status").default("OPEN").notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedByUserId: uuid("deleted_by_user_id").references(() => appUsers.id, { onDelete: "restrict" }),
    deletionReason: text("deletion_reason"),
    ...timestamps,
  },
  (table) => [
    index("topics_status_created_at_idx").on(table.status, table.createdAt),
    index("topics_owner_user_id_idx").on(table.ownerUserId),
  ],
);

export const topicTags = core.table(
  "topic_tags",
  {
    topicId: uuid("topic_id").notNull().references(() => topics.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.topicId, table.tagId] })],
);

export const statements = core.table(
  "statements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    topicId: uuid("topic_id").notNull().references(() => topics.id, { onDelete: "restrict" }),
    authorUserId: uuid("author_user_id").notNull().references(() => appUsers.id, { onDelete: "restrict" }),
    body: text("body").notNull(),
    authorVisibility: authorVisibility("author_visibility").notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedByUserId: uuid("deleted_by_user_id").references(() => appUsers.id, { onDelete: "restrict" }),
    deletionReason: text("deletion_reason"),
    ...timestamps,
  },
  (table) => [index("statements_topic_created_at_idx").on(table.topicId, table.createdAt)],
);

export const votes = core.table(
  "votes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    statementId: uuid("statement_id").notNull().references(() => statements.id, { onDelete: "restrict" }),
    userId: uuid("user_id").notNull().references(() => appUsers.id, { onDelete: "restrict" }),
    value: voteValue("value").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("votes_statement_user_unique").on(table.statementId, table.userId),
    index("votes_statement_id_idx").on(table.statementId),
  ],
);

export const auditLogs = core.table(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorUserId: uuid("actor_user_id").references(() => appUsers.id, { onDelete: "set null" }),
    action: varchar("action", { length: 100 }).notNull(),
    entityType: varchar("entity_type", { length: 50 }).notNull(),
    entityId: uuid("entity_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("audit_logs_entity_idx").on(table.entityType, table.entityId),
    index("audit_logs_created_at_idx").on(
      table.createdAt.desc(),
      table.id.desc(),
    ),
    index("audit_logs_action_created_at_idx").on(
      table.action,
      table.createdAt.desc(),
      table.id.desc(),
    ),
  ],
);

export const analysisJobs = analysis.table(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    topicId: uuid("topic_id").notNull().references(() => topics.id, { onDelete: "restrict" }),
    status: analysisJobStatus("status").default("PENDING").notNull(),
    availableAt: timestamp("available_at", { withTimezone: true }).notNull(),
    attempts: integer("attempts").default(0).notNull(),
    lastError: text("last_error"),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("analysis_jobs_claim_idx").on(table.status, table.availableAt),
    uniqueIndex("analysis_jobs_one_pending_per_topic")
      .on(table.topicId)
      .where(sql`${table.status} = 'PENDING'`),
  ],
);

export const analysisRuns = analysis.table(
  "runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    topicId: uuid("topic_id").notNull().references(() => topics.id, { onDelete: "restrict" }),
    jobId: uuid("job_id").references(() => analysisJobs.id, { onDelete: "set null" }),
    status: analysisRunStatus("status").default("RUNNING").notNull(),
    algorithmVersion: varchar("algorithm_version", { length: 100 }).notNull(),
    participantCount: integer("participant_count").default(0).notNull(),
    statementCount: integer("statement_count").default(0).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("analysis_runs_topic_created_at_idx").on(table.topicId, table.createdAt)],
);

export const analysisGroups = analysis.table(
  "groups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    analysisRunId: uuid("analysis_run_id").notNull().references(() => analysisRuns.id, { onDelete: "cascade" }),
    ordinal: integer("ordinal").notNull(),
    participantCount: integer("participant_count").notNull(),
    centroidX: real("centroid_x").notNull(),
    centroidY: real("centroid_y").notNull(),
  },
  (table) => [uniqueIndex("analysis_groups_run_ordinal_unique").on(table.analysisRunId, table.ordinal)],
);

export const analysisPoints = analysis.table(
  "points",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    analysisRunId: uuid("analysis_run_id").notNull().references(() => analysisRuns.id, { onDelete: "cascade" }),
    groupId: uuid("group_id").references(() => analysisGroups.id, { onDelete: "set null" }),
    x: real("x").notNull(),
    y: real("y").notNull(),
  },
  (table) => [index("analysis_points_run_id_idx").on(table.analysisRunId)],
);

export const analysisStatementResults = analysis.table(
  "statement_results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    analysisRunId: uuid("analysis_run_id").notNull().references(() => analysisRuns.id, { onDelete: "cascade" }),
    statementId: uuid("statement_id").notNull().references(() => statements.id, { onDelete: "restrict" }),
    groupId: uuid("group_id").references(() => analysisGroups.id, { onDelete: "cascade" }),
    kind: varchar("kind", { length: 30 }).notNull(),
    score: real("score").notNull(),
    rank: integer("rank").notNull(),
  },
  (table) => [
    uniqueIndex("analysis_statement_results_unique").on(
      table.analysisRunId,
      table.statementId,
      table.groupId,
      table.kind,
    ),
    index("analysis_statement_results_group_idx").on(table.groupId),
  ],
);
