import { ApiErrorSchema } from "@private-polis/contracts";
import type { MiddlewareHandler } from "hono";
import type { AppEnvironment } from "./context.js";

export interface RateLimitDecision {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

export interface RateLimiter {
  consume(key: string, now?: number): RateLimitDecision;
}

export function createFixedWindowRateLimiter(limit: number, windowMs: number): RateLimiter {
  const entries = new Map<string, { count: number; resetAt: number }>();
  return {
    consume(key, now = Date.now()) {
      const previous = entries.get(key);
      const entry = !previous || previous.resetAt <= now
        ? { count: 0, resetAt: now + windowMs }
        : previous;
      entry.count += 1;
      entries.set(key, entry);
      if (entries.size > 10_000) {
        for (const [candidate, value] of entries) {
          if (value.resetAt <= now) entries.delete(candidate);
        }
      }
      return {
        allowed: entry.count <= limit,
        limit,
        remaining: Math.max(0, limit - entry.count),
        resetAt: entry.resetAt,
      };
    },
  };
}

export function rateLimit(
  limiter: RateLimiter,
  keyFor: (context: Parameters<MiddlewareHandler<AppEnvironment>>[0]) => string,
): MiddlewareHandler<AppEnvironment> {
  return async (c, next) => {
    const decision = limiter.consume(keyFor(c));
    c.header("RateLimit-Limit", String(decision.limit));
    c.header("RateLimit-Remaining", String(decision.remaining));
    c.header("RateLimit-Reset", String(Math.ceil(decision.resetAt / 1_000)));
    if (!decision.allowed) {
      c.header("Retry-After", String(Math.max(1, Math.ceil((decision.resetAt - Date.now()) / 1_000))));
      return c.json(
        ApiErrorSchema.parse({
          error: {
            code: "RATE_LIMITED",
            message: "Too many requests. Try again later.",
            requestId: c.get("requestId"),
          },
        }),
        429,
      );
    }
    await next();
  };
}

export function requestAddress(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? headers.get("x-real-ip")?.trim()
    ?? "unknown";
}
