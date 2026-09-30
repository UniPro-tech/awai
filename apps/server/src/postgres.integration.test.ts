import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq, inArray, sql } from "drizzle-orm";
import { createApp } from "./app.js";
import { createDatabase } from "./db/client.js";
import {
  analysisJobs,
  analysisGroups,
  analysisPoints,
  analysisRuns,
  analysisStatementResults,
  appUsers,
  auditLogs,
  categories,
  statements,
  tags,
  topics,
  votes,
} from "./db/schema.js";
import { createPostgresServices } from "./services/services.js";

const shouldRun = process.env.RUN_POSTGRES_INTEGRATION === "1";
const databaseUrl = process.env.DATABASE_URL
  ?? "postgresql://private_polis:private_polis@localhost:5432/private_polis";
const runtime = createDatabase(databaseUrl);
const services = createPostgresServices(runtime.db);
const owner = {
  id: crypto.randomUUID(),
  displayName: "Integration owner",
  role: "USER" as const,
};
const administrator = {
  id: crypto.randomUUID(),
  displayName: "Integration administrator",
  role: "ADMIN" as const,
};
const nextOwner = {
  id: crypto.randomUUID(),
  displayName: "Integration next owner",
  role: "USER" as const,
};
let topicId: string | undefined;
let categoryId: string | undefined;
let tagId: string | undefined;

describe.runIf(shouldRun)("PostgreSQL integration", () => {
  beforeAll(async () => {
    const providerTable = await runtime.pool.query<{ name: string | null }>(
      "select to_regclass('auth.sso_provider')::text as name",
    );
    expect(providerTable.rows[0]?.name).toBe("auth.sso_provider");
    await runtime.db.insert(appUsers).values([
      { ...owner, authUserId: `integration-${owner.id}` },
      { ...administrator, authUserId: `integration-${administrator.id}` },
      { ...nextOwner, authUserId: `integration-${nextOwner.id}` },
    ]);
  });

  afterAll(async () => {
    if (topicId) {
      await runtime.db.execute(sql`
        delete from analysis.statement_results
        where analysis_run_id in (select id from analysis.runs where topic_id = ${topicId})
      `);
      await runtime.db.execute(sql`
        delete from analysis.points
        where analysis_run_id in (select id from analysis.runs where topic_id = ${topicId})
      `);
      await runtime.db.execute(sql`
        delete from analysis.groups
        where analysis_run_id in (select id from analysis.runs where topic_id = ${topicId})
      `);
      await runtime.db.delete(analysisRuns).where(eq(analysisRuns.topicId, topicId));
      await runtime.db.delete(analysisJobs).where(eq(analysisJobs.topicId, topicId));
      const statementRows = await runtime.db
        .select({ id: statements.id })
        .from(statements)
        .where(eq(statements.topicId, topicId));
      if (statementRows.length > 0) {
        await runtime.db.delete(votes).where(inArray(votes.statementId, statementRows.map(({ id }) => id)));
      }
      await runtime.db.delete(statements).where(eq(statements.topicId, topicId));
      await runtime.db.delete(auditLogs).where(
        and(eq(auditLogs.entityType, "topic"), eq(auditLogs.entityId, topicId)),
      );
      await runtime.db.delete(topics).where(eq(topics.id, topicId));
    }
    if (tagId) await runtime.db.delete(tags).where(eq(tags.id, tagId));
    if (categoryId) await runtime.db.delete(categories).where(eq(categories.id, categoryId));
    await runtime.db.delete(appUsers).where(inArray(appUsers.id, [owner.id, administrator.id, nextOwner.id]));
    await runtime.pool.end();
  });

  it("preserves anonymous statements and records topic management audits", async () => {
    const [category] = await runtime.db
      .insert(categories)
      .values({ name: `Integration category ${owner.id}` })
      .returning({ id: categories.id });
    if (!category) throw new Error("Category insertion failed.");
    categoryId = category.id;
    const tagName = `integration-${owner.id}`;
    const topic = await services.topics.create(
      {
        title: "PostgreSQL integration topic",
        description: "",
        authorVisibility: "ANONYMOUS",
        statementIdentityPolicy: "OPTIONAL",
        categoryId,
        tags: [tagName],
      },
      owner,
    );
    topicId = topic.id;
    tagId = topic.tags[0]?.id;
    if (!tagId) throw new Error("Tag insertion failed.");
    await expect(services.topics.list({ categoryId, tagId })).resolves.toMatchObject([
      { id: topic.id },
    ]);
    await expect(services.topics.list({ tagId: crypto.randomUUID() })).resolves.toEqual([]);
    const created = await services.statements.create(
      topic.id,
      { body: "The author must remain private.", authorVisibility: "ANONYMOUS" },
      owner,
    );
    expect("statement" in created).toBe(true);
    if (!("statement" in created)) return;

    await services.votes.setVote(
      created.statement.id,
      topic.id,
      owner.id,
      "AGREE",
    );
    await expect(services.votes.listCurrentUserVotes(topic.id, owner.id)).resolves.toEqual([
      { statementId: created.statement.id, value: "AGREE" },
    ]);
    const [run] = await runtime.db
      .insert(analysisRuns)
      .values({
        topicId: topic.id,
        status: "COMPLETED",
        algorithmVersion: "integration-test",
        participantCount: 2,
        statementCount: 1,
        completedAt: new Date(),
      })
      .returning({ id: analysisRuns.id });
    if (!run) throw new Error("Analysis run insert failed.");
    const groups = await runtime.db
      .insert(analysisGroups)
      .values([
        {
          analysisRunId: run.id,
          ordinal: 0,
          participantCount: 1,
          centroidX: -1,
          centroidY: 0,
        },
        {
          analysisRunId: run.id,
          ordinal: 1,
          participantCount: 1,
          centroidX: 1,
          centroidY: 0,
        },
      ])
      .returning({ id: analysisGroups.id, ordinal: analysisGroups.ordinal });
    await runtime.db.insert(analysisPoints).values(
      groups.map((group) => ({
        analysisRunId: run.id,
        groupId: group.id,
        x: group.ordinal === 0 ? -1 : 1,
        y: 0,
      })),
    );
    await runtime.db.insert(analysisStatementResults).values(
      groups.map((group) => ({
        analysisRunId: run.id,
        statementId: created.statement.id,
        groupId: group.id,
        kind:
          group.ordinal === 0
            ? "REPRESENTATIVE_AGREE"
            : "REPRESENTATIVE_DISAGREE",
        score: 1,
        rank: 1,
      })),
    );

    const viewerAnalysis = await services.analysis.latest(topic.id, owner.id);
    expect(viewerAnalysis?.viewerPoint).toMatchObject({ groupOrdinal: 0 });
    expect(viewerAnalysis?.viewerPoint?.x).toBeLessThan(-0.9);
    expect(viewerAnalysis?.points[0]).not.toHaveProperty("userId");

    await expect(
      runtime.db.select({ authorUserId: statements.authorUserId }).from(statements)
        .where(eq(statements.id, created.statement.id)),
    ).resolves.toEqual([{ authorUserId: owner.id }]);

    await services.topics.update(
      topic.id,
      { statementIdentityPolicy: "IDENTIFIED_REQUIRED", status: "CLOSED" },
      administrator,
    );
    await services.topics.changeOwner(topic.id, { ownerUserId: nextOwner.id }, administrator);

    const app = createApp({
      services,
      authenticate: async () => ({ status: "authenticated", user: administrator }),
      authRateLimiter: false,
      apiRateLimiter: false,
    });
    const response = await app.request(`/api/v1/topics/${topic.id}/statements`);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      items: [{ author: { visibility: "ANONYMOUS", displayName: null } }],
    });

    const audits = await runtime.db
      .select({ action: auditLogs.action })
      .from(auditLogs)
      .where(and(eq(auditLogs.entityType, "topic"), eq(auditLogs.entityId, topic.id)));
    expect(audits.map(({ action }) => action)).toEqual(expect.arrayContaining([
      "IDENTITY_POLICY_CHANGE",
      "TOPIC_STATUS_CHANGE",
      "TOPIC_OWNER_CHANGE",
    ]));
  });
});
