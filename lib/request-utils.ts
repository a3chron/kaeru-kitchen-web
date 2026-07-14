import "server-only";
import { createHash } from "node:crypto";
import ISO6391 from "iso-639-1";
import { NextRequest } from "next/server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

/** True for a valid ISO 639-1 code, or the literal "all". */
export function isValidLanguage(value: unknown): value is string {
  return (
    typeof value === "string" && (value === "all" || ISO6391.validate(value))
  );
}

/**
 * Best-effort client IP for rate-limiting and per-IP dedup.
 *
 * Prefers `x-real-ip`, which Vercel sets to the true connecting IP and does NOT
 * let the client override. `x-forwarded-for` is only a fallback (local dev /
 * non-Vercel hosts): its left-most hop is client-supplied, so trusting it would
 * let an attacker rotate the header to bypass the limiter and the flag/rating
 * dedup. Falling back to its first hop is acceptable off-Vercel where there is
 * no better signal.
 */
export function getClientIp(request: NextRequest): string {
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim() || "unknown";
  return "unknown";
}

/**
 * Salted SHA-256 hash of the client IP, for review/flag dedup without storing
 * raw IPs. Falls back to an unsalted hash (with a warning) if IP_HASH_SALT is
 * unset, so dedup still works in dev.
 */
export function getClientIpHash(request: NextRequest): string {
  const salt = process.env.IP_HASH_SALT;
  if (!salt) {
    const isProd =
      !!process.env.VERCEL || process.env.NODE_ENV === "production";
    if (isProd) {
      // Fail closed in production: an unsalted IP hash is trivially reversible
      // (PII), so refuse rather than silently store it (mirrors rate-limit.ts).
      throw new Error("IP_HASH_SALT is not configured");
    }
    console.warn(
      "IP_HASH_SALT is not set — falling back to an unsalted IP hash (dev only).",
    );
  }
  return createHash("sha256")
    .update(`${salt ?? ""}:${getClientIp(request)}`)
    .digest("hex");
}

/** Max accepted request body size for write endpoints. */
export const MAX_BODY_BYTES = 256 * 1024;

type JsonBodyResult =
  | { ok: true; body: any }
  | { ok: false; status: number; error: string };

/**
 * Reads and JSON-parses a request body, rejecting anything over MAX_BODY_BYTES
 * (Next route handlers impose no size limit of their own). Returns a typed
 * result so the caller can respond with the right status instead of a 500.
 */
export async function readJsonBody(
  request: NextRequest,
): Promise<JsonBodyResult> {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return { ok: false, status: 413, error: "Payload too large" };
  }
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return { ok: false, status: 413, error: "Payload too large" };
  }
  try {
    return { ok: true, body: JSON.parse(raw) };
  } catch {
    return { ok: false, status: 400, error: "Invalid JSON" };
  }
}
