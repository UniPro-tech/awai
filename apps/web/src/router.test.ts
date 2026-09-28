import { describe, expect, it } from "vitest";
import { router } from "./router";

describe("file-based routes", () => {
  it.each([
    ["/topics/new", "/topics/new"],
    ["/topics/$topicId", "/topics/topic-1"],
    ["/topics/$topicId/results", "/topics/topic-1/results"],
    ["/topics/$topicId/settings", "/topics/topic-1/settings"],
    ["/profile", "/profile"],
    ["/admin/users", "/admin/users"],
    ["/admin/categories", "/admin/categories"],
    ["/admin/settings", "/admin/settings"],
  ] as const)("builds %s", (to, expected) => {
    expect(router.buildLocation({ to, params: { topicId: "topic-1" } }).pathname).toBe(expected);
  });
});
