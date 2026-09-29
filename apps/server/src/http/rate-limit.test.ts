import { describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { createMemoryServices } from "../services/services.js";
import { createFixedWindowRateLimiter, requestAddress } from "./rate-limit.js";

const user = {
  id: "00000000-0000-4000-8000-000000000001",
  displayName: "Rate limited user",
  role: "USER" as const,
};

describe("rate limiting", () => {
  it("resets fixed windows and reports remaining requests", () => {
    const limiter = createFixedWindowRateLimiter(2, 1_000);
    expect(limiter.consume("user", 0)).toMatchObject({
      allowed: true,
      remaining: 1,
    });
    expect(limiter.consume("user", 1)).toMatchObject({
      allowed: true,
      remaining: 0,
    });
    expect(limiter.consume("user", 2)).toMatchObject({
      allowed: false,
      remaining: 0,
    });
    expect(limiter.consume("user", 1_000)).toMatchObject({
      allowed: true,
      remaining: 1,
    });
  });

  it("uses the first forwarded address", () => {
    expect(
      requestAddress(
        new Headers({ "x-forwarded-for": "203.0.113.9, 10.0.0.2" }),
      ),
    ).toBe("203.0.113.9");
  });

  it("uses the cloudflare address if no forwarded address is present", () => {
    expect(
      requestAddress(
        new Headers({ "cf-connecting-ip": "203.0.113.9, 10.0.0.2" }),
      ),
    ).toBe("203.0.113.9");
  });

  it("returns the shared API error after the per-user limit", async () => {
    const app = createApp({
      services: createMemoryServices(),
      authenticate: async () => ({ status: "authenticated", user }),
      authRateLimiter: false,
      apiRateLimiter: createFixedWindowRateLimiter(1, 60_000),
    });

    expect((await app.request("/api/v1/topics")).status).toBe(200);
    const response = await app.request("/api/v1/topics");
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBeTruthy();
    expect(await response.json()).toMatchObject({
      error: { code: "RATE_LIMITED" },
    });
  });
});
