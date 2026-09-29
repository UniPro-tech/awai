import { describe, expect, it } from "vitest";
import { orderStatementsForVoting } from "./voting-order";

const statements = [
  { id: "one" },
  { id: "two" },
  { id: "three" },
  { id: "four" },
];

describe("orderStatementsForVoting", () => {
  it("places shuffled unvoted statements before shuffled voted statements", () => {
    const randomValues = [0, 0, 0, 0];
    const ordered = orderStatementsForVoting(
      statements,
      new Set(["one", "three"]),
      () => randomValues.shift() ?? 0,
    );

    expect(ordered.slice(0, 2).map(({ id }) => id)).toEqual(["four", "two"]);
    expect(ordered.slice(2).map(({ id }) => id)).toEqual(["three", "one"]);
  });

  it("does not mutate the API response", () => {
    const original = [...statements];

    orderStatementsForVoting(statements, new Set(), () => 0);

    expect(statements).toEqual(original);
  });
});
