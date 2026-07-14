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
export function getClientIpFromHeaders(h: Headers): string {
  const realIp = h.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim() || "unknown";
  return "unknown";
}

/** NextRequest convenience wrapper around {@link getClientIpFromHeaders}. */
export function getClientIp(request: NextRequest): string {
  return getClientIpFromHeaders(request.headers);
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

  // Stream the body with a running byte cap instead of buffering it all first: a
  // missing or spoofed content-length must not let us read an unbounded body into
  // memory. Count real bytes (not UTF-16 code units, which under-count multi-byte
  // characters) against the cap.
  let raw: string;
  const stream = request.body;
  if (!stream) {
    raw = await request.text();
    if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) {
      return { ok: false, status: 413, error: "Payload too large" };
    }
  } else {
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > MAX_BODY_BYTES) {
        await reader.cancel();
        return { ok: false, status: 413, error: "Payload too large" };
      }
      chunks.push(value);
    }
    raw = Buffer.concat(chunks).toString("utf8");
  }

  try {
    return { ok: true, body: JSON.parse(raw) };
  } catch {
    return { ok: false, status: 400, error: "Invalid JSON" };
  }
}
