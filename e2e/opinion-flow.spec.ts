import { expect, test, type Page } from "@playwright/test";

const topicId = "00000000-0000-4000-8000-000000000010";
const statementOneId = "00000000-0000-4000-8000-000000000011";
const statementTwoId = "00000000-0000-4000-8000-000000000012";
const now = "2026-09-29T00:00:00.000Z";

const statements = [
  {
    id: statementOneId,
    topicId,
    body: "公園にもっと木陰を増やすべきだ",
    author: { visibility: "ANONYMOUS", displayName: null },
    createdAt: now,
    updatedAt: now,
  },
  {
    id: statementTwoId,
    topicId,
    body: "夜間の照明を増やすべきだ",
    author: { visibility: "ANONYMOUS", displayName: null },
    createdAt: now,
    updatedAt: now,
  },
];

const analysis = {
  id: "00000000-0000-4000-8000-000000000020",
  status: "COMPLETED",
  algorithmVersion: "red-dwarf-0.4.0",
  participantCount: 8,
  statementCount: 2,
  completedAt: now,
  createdAt: now,
  groups: [
    { ordinal: 0, participantCount: 4, centroid: { x: -1, y: 0 } },
    { ordinal: 1, participantCount: 4, centroid: { x: 1, y: 0 } },
  ],
  points: [
    { x: -1.2, y: 0.1, groupOrdinal: 0 },
    { x: -0.8, y: -0.1, groupOrdinal: 0 },
    { x: 0.8, y: 0.1, groupOrdinal: 1 },
    { x: 1.2, y: -0.1, groupOrdinal: 1 },
  ],
  viewerPoint: { x: -0.9, y: 0, groupOrdinal: 0 },
  statementResults: [
    {
      statement: statements[0],
      groupOrdinal: null,
      kind: "CONSENSUS_AGREE",
      score: 0.9,
      rank: 1,
    },
    {
      statement: statements[0],
      groupOrdinal: 0,
      kind: "REPRESENTATIVE_AGREE",
      score: 0.8,
      rank: 1,
    },
    {
      statement: statements[1],
      groupOrdinal: 1,
      kind: "REPRESENTATIVE_DISAGREE",
      score: 0.7,
      rank: 1,
    },
  ],
};

async function mockOpinionApp(page: Page) {
  const votes = new Map<string, string | null>(statements.map((item) => [item.id, null]));
  await page.addInitScript(() => localStorage.setItem("private-polis-language", "ja"));
  await page.route("**/api/auth/get-session", (route) =>
    route.fulfill({
      json: {
        user: {
          id: "auth-user",
          name: "テストユーザー",
          email: "user@example.com",
          emailVerified: true,
          createdAt: now,
          updatedAt: now,
        },
        session: {
          id: "session",
          userId: "auth-user",
          token: "test",
          expiresAt: "2027-09-29T00:00:00.000Z",
          createdAt: now,
          updatedAt: now,
        },
      },
    }),
  );
  await page.route("**/api/v1/me", (route) =>
    route.fulfill({
      json: {
        id: "00000000-0000-4000-8000-000000000001",
        displayName: "テストユーザー",
        role: "USER",
      },
    }),
  );
  await page.route(`**/api/v1/topics/${topicId}`, (route) =>
    route.fulfill({
      json: {
        id: topicId,
        title: "まちの未来",
        description: "暮らしやすいまちを考える",
        author: { visibility: "IDENTIFIED", displayName: "テストユーザー" },
        statementIdentityPolicy: "OPTIONAL",
        status: "OPEN",
        category: null,
        tags: [],
        createdAt: now,
        updatedAt: now,
      },
    }),
  );
  await page.route(`**/api/v1/topics/${topicId}/statements`, (route) =>
    route.fulfill({ json: { items: statements } }),
  );
  await page.route("**/api/v1/statements/*/vote", async (route) => {
    const statementId = route.request().url().split("/").at(-2)!;
    if (route.request().method() === "PUT") {
      const value = (await route.request().postDataJSON()).value as string;
      votes.set(statementId, value);
      await route.fulfill({ json: { value } });
      return;
    }
    await route.fulfill({ json: { value: votes.get(statementId) ?? null } });
  });
  await page.route("**/api/v1/statements/*/stats", (route) =>
    route.fulfill({ json: { agree: 5, disagree: 2, pass: 1, total: 8 } }),
  );
  await page.route(`**/api/v1/topics/${topicId}/analysis/latest`, (route) =>
    route.fulfill({ json: analysis }),
  );
  await page.route(`**/api/v1/topics/${topicId}/analysis/runs`, (route) =>
    route.fulfill({ json: { items: [analysis] } }),
  );
}

test("shows one statement and reveals counts and position only after voting", async ({
  page,
}) => {
  await mockOpinionApp(page);
  await page.goto(`/topics/${topicId}`);

  await expect(page.getByText(statements[0].body)).toBeVisible();
  await expect(page.getByText(statements[1].body)).toHaveCount(0);
  await expect(page.getByText("賛成 5・反対 2・パス 1")).toHaveCount(0);
  await expect(page.getByText("回答すると、みんなの投票結果が表示されます。")).toBeVisible();

  await page.getByRole("button", { name: "賛成" }).click();
  await expect(page.getByText("賛成 5・反対 2・パス 1")).toBeVisible();
  await expect(page.getByRole("heading", { name: "意見マップ上のあなた" })).toBeVisible();
  await expect(page.getByText("あなたの推定位置")).toBeVisible();

  await page.getByRole("button", { name: "次の意見" }).click();
  await expect(page.getByText(statements[1].body)).toBeVisible();
  await expect(page.getByText(statements[0].body)).toHaveCount(0);
});

test("groups findings and downloads a detailed PDF", async ({ page }) => {
  await mockOpinionApp(page);
  await page.goto(`/topics/${topicId}/results`);

  await expect(page.getByRole("heading", { name: "共通の意見" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "グループ 1の意見" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "グループ 2の意見" })).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "詳細分析PDFをダウンロード" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/-analysis\.pdf$/);
  const stream = await download.createReadStream();
  const firstChunk = await new Promise<Buffer>((resolve, reject) => {
    stream.once("data", (chunk) => resolve(Buffer.from(chunk)));
    stream.once("error", reject);
  });
  expect(firstChunk.subarray(0, 8).toString()).toBe("%PDF-1.4");
});
