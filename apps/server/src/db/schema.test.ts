import { getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { analysisPoints, topics, votes } from "./schema.js";

describe("database schema", () => {
  it("keeps public API concepts in explicit database schemas", () => {
    expect(getTableName(topics)).toBe("topics");
    expect(getTableName(votes)).toBe("votes");
    expect(getTableName(analysisPoints)).toBe("points");
  });

  it("does not store a user identity on analysis points", () => {
    expect(analysisPoints).not.toHaveProperty("userId");
  });
});
