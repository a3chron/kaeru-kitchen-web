import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { getClientIp } from "@/lib/request-utils";

// "write" = tight limit for state-changing endpoints; "read" = generous limit
// for public GET endpoints (throttles scraping/abuse of the fuzzy search RPC
// without impeding normal browsing).
type LimitKind = "write" | "read";

// Lazy singletons per kind. If Upstash is not configured, rate limiting is
// disabled with a one-time warning — graceful degradation, NOT a real
// substitute (a per-lambda in-memory fallback is near-useless on serverless).
const limiters: Partial<Record<LimitKind, Ratelimit | null>> = {};
let warned = false;

function getLimiter(kind: LimitKind): Ratelimit | null {
  if (kind in limiters) return limiters[kind] ?? null;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    if (!warned) {
      warned = true;
      console.warn(
        "Upstash Redis is not configured. Rate limiting is unavailable — " +
          "writes fail closed in production, reads fail open. " +
          "Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to enable it.",
      );
    }
    limiters[kind] = null;
    return null;
  }

  const redis = new Redis({ url, token });
  limiters[kind] = new Ratelimit({
    redis,
    limiter:
      kind === "read"
        ? Ratelimit.slidingWindow(60, "60 s")
        : Ratelimit.slidingWindow(5, "60 s"),
    prefix: kind === "read" ? "kkh-rl-r" : "kkh-rl",
    analytics: false,
  });
  return limiters[kind];
}

export interface RateLimitResult {
  ok: boolean;
  retryAfter?: number; // seconds
}

/**
 * Rate-limit a request, keyed by (bucket, client IP).
 *
 * When Upstash is UNCONFIGURED, write requests fail **closed in production** (a
 * deploy that forgot the env vars should not silently ship with zero abuse
 * protection) but stay open in local dev; read requests always fail **open**
 * (blocking all public browsing is worse than having no read limit). A transient
 * limiter error at runtime fails **open** either way — a brief Upstash blip
 * shouldn't take down the endpoints.
 */
export async function checkRateLimit(
  request: NextRequest,
  bucket: string,
  kind: LimitKind = "write",
): Promise<RateLimitResult> {
  const rl = getLimiter(kind);
  if (!rl) {
    if (kind === "read") return { ok: true };
    const isProd =
      !!process.env.VERCEL || process.env.NODE_ENV === "production";
    return isProd ? { ok: false, retryAfter: 60 } : { ok: true };
  }

  try {
    const key = `${bucket}:${getClientIp(request)}`;
    const { success, reset } = await rl.limit(key);
    if (success) return { ok: true };

    const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
    return { ok: false, retryAfter };
  } catch (err) {
    console.error("Rate limiter error — allowing request (fail open):", err);
    return { ok: true };
  }
}

/**
 * Header-based twin of `getClientIp` (request-utils.ts) for contexts that hold a
 * bare `Headers` object rather than a NextRequest — e.g. server actions reading
 * `await headers()`. Same precedence: prefer the Vercel-set, unspoofable
 * `x-real-ip`, fall back to the left-most `x-forwarded-for` hop off-Vercel.
 */
export function getClientIpFromHeaders(h: Headers): string {
  const realIp = h.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim() || "unknown";
  return "unknown";
}

/**
 * Rate-limit twin of `checkRateLimit` for **server actions**, which have no
 * NextRequest — it reads the incoming request headers via `await headers()`
 * from next/headers. Same limiter, keying, and fail-open/closed semantics as
 * `checkRateLimit` (read fails open; write fails closed only in production; a
 * runtime limiter error fails open).
 */
export async function checkRateLimitForAction(
  bucket: string,
  kind: LimitKind = "write",
): Promise<RateLimitResult> {
  const rl = getLimiter(kind);
  if (!rl) {
    if (kind === "read") return { ok: true };
    const isProd =
      !!process.env.VERCEL || process.env.NODE_ENV === "production";
    return isProd ? { ok: false, retryAfter: 60 } : { ok: true };
  }

  try {
    const key = `${bucket}:${getClientIpFromHeaders(await headers())}`;
    const { success, reset } = await rl.limit(key);
    if (success) return { ok: true };

    const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
    return { ok: false, retryAfter };
  } catch (err) {
    console.error("Rate limiter error — allowing request (fail open):", err);
    return { ok: true };
  }
}

/** Standard 429 response for a failed rate-limit check. */
export function rateLimited(retryAfter?: number) {
  return NextResponse.json(
    { error: "Too many requests. Please try again later." },
    {
      status: 429,
      headers: retryAfter ? { "Retry-After": String(retryAfter) } : undefined,
    },
  );
}
