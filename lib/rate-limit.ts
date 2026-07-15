import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { getClientIp, getClientIpFromHeaders } from "@/lib/request-utils";

// Rate-limit buckets, tuned per operation:
//   read    — generous, for public GET endpoints (throttles scraping without
//             impeding normal browsing)
//   write   — generic state-changing default (e.g. flagging)
//   publish — public submissions to the hub (add-recipe): tightest, since these
//             go live for everyone; abused, they flood the public feed
//   share   — private share-link creation: looser than publish (sharing your own
//             recipes is expected and not a public-spam vector)
type LimitKind = "write" | "read" | "publish" | "share";

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
  // Per-bucket window + max. publish is the tightest (2/60s × up to 20 recipes
  // per request = 40 recipes/min/IP); share stays generous for legit use.
  const config = {
    read: { limiter: Ratelimit.slidingWindow(60, "60 s"), prefix: "kkh-rl-r" },
    write: { limiter: Ratelimit.slidingWindow(5, "60 s"), prefix: "kkh-rl" },
    publish: {
      limiter: Ratelimit.slidingWindow(2, "60 s"),
      prefix: "kkh-rl-p",
    },
    share: { limiter: Ratelimit.slidingWindow(20, "60 s"), prefix: "kkh-rl-s" },
  }[kind];
  limiters[kind] = new Ratelimit({
    redis,
    limiter: config.limiter,
    prefix: config.prefix,
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
async function checkRateLimitForIp(
  ip: string,
  bucket: string,
  kind: LimitKind,
): Promise<RateLimitResult> {
  const rl = getLimiter(kind);
  if (!rl) {
    if (kind === "read") return { ok: true };
    const isProd =
      !!process.env.VERCEL || process.env.NODE_ENV === "production";
    return isProd ? { ok: false, retryAfter: 60 } : { ok: true };
  }

  try {
    const { success, reset } = await rl.limit(`${bucket}:${ip}`);
    if (success) return { ok: true };

    const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
    return { ok: false, retryAfter };
  } catch (err) {
    console.error("Rate limiter error — allowing request (fail open):", err);
    return { ok: true };
  }
}

export async function checkRateLimit(
  request: NextRequest,
  bucket: string,
  kind: LimitKind = "write",
): Promise<RateLimitResult> {
  return checkRateLimitForIp(getClientIp(request), bucket, kind);
}

/**
 * Twin of `checkRateLimit` for **server actions**, which have no NextRequest —
 * it reads the incoming request headers via `await headers()` from next/headers.
 * Same limiter, keying and fail-open/closed semantics.
 */
export async function checkRateLimitForAction(
  bucket: string,
  kind: LimitKind = "write",
): Promise<RateLimitResult> {
  return checkRateLimitForIp(
    getClientIpFromHeaders(await headers()),
    bucket,
    kind,
  );
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
