import "server-only";

import { headers } from "next/headers";

/**
 * Rate limiter for sign-in, registration, password resets, newsletter sign-ups, checkout and
 * downloads.
 *
 * - With UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN set: counts are shared by every server
 *   instance (fixed window, one INCR per attempt over Upstash's REST API — no extra package).
 * - Otherwise (or if Upstash is unreachable): an in-memory sliding window per server instance,
 *   which still stops casual abuse.
 */
const hits = new Map<string, number[]>();

export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/** Returns true when the action is allowed; false when the limit is exceeded. */
export async function rateLimit(bucket: string, limit: number, windowMs: number, extraKey = "") {
  const key = `${bucket}:${await clientIp()}:${extraKey}`;
  const shared = await sharedCount(key, windowMs);
  if (shared !== null) return shared <= limit;
  return memoryLimit(key, limit, windowMs);
}

function memoryLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 10_000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k); // bounded memory
  return true;
}

/** Attempts in the current window from Upstash, or null when not configured / unavailable. */
async function sharedCount(key: string, windowMs: number): Promise<number | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const windowKey = `rl:${key}:${Math.floor(Date.now() / windowMs)}`;
  try {
    const res = await fetch(`${url.replace(/\/+$/, "")}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        ["INCR", windowKey],
        ["PEXPIRE", windowKey, String(windowMs)],
      ]),
      cache: "no-store",
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return null;
    const [incr] = (await res.json()) as { result?: number; error?: string }[];
    return typeof incr?.result === "number" ? incr.result : null;
  } catch {
    return null; // fail open to the in-memory limiter rather than blocking sign-ins
  }
}
