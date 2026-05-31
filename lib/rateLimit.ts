/**
 * Async rate limiter with Upstash Redis (production) + in-memory fallback (dev/test).
 *
 * When UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set, uses Upstash
 * sliding-window algorithm shared across all Vercel instances.
 * Otherwise falls back to a per-process Map (acceptable for dev/staging).
 */

import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

// ─── In-memory fallback ───────────────────────────────────────────────────────

const store = new Map<string, number[]>()

function inMemoryCheck(key: string, limit: number, windowMs: number): RateLimitResult {
  const now        = Date.now()
  const timestamps = (store.get(key) ?? []).filter((t) => now - t < windowMs)

  if (timestamps.length >= limit) {
    return { allowed: false, remaining: 0, resetAt: Math.min(...timestamps) + windowMs }
  }

  timestamps.push(now)
  store.set(key, timestamps)

  if (Math.random() < 0.01) {
    for (const [k, v] of store.entries()) {
      if (v.every((t) => now - t >= windowMs)) store.delete(k)
    }
  }

  return { allowed: true, remaining: limit - timestamps.length, resetAt: now + windowMs }
}

// ─── Upstash limiter cache (one instance per window config) ──────────────────

const limiterCache = new Map<string, Ratelimit>()

function getUpstashLimiter(limit: number, windowMs: number): Ratelimit {
  const cacheKey = `${limit}:${windowMs}`
  if (!limiterCache.has(cacheKey)) {
    limiterCache.set(
      cacheKey,
      new Ratelimit({
        redis:     Redis.fromEnv(),
        limiter:   Ratelimit.slidingWindow(limit, `${windowMs}ms`),
        analytics: false,
      }),
    )
  }
  return limiterCache.get(cacheKey)!
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface RateLimitResult {
  allowed:   boolean
  remaining: number
  resetAt:   number // epoch ms
}

const hasUpstash =
  typeof process.env.UPSTASH_REDIS_REST_URL === "string" &&
  process.env.UPSTASH_REDIS_REST_URL.length > 0 &&
  typeof process.env.UPSTASH_REDIS_REST_TOKEN === "string" &&
  process.env.UPSTASH_REDIS_REST_TOKEN.length > 0

export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  if (!hasUpstash) return inMemoryCheck(key, limit, windowMs)

  try {
    const limiter = getUpstashLimiter(limit, windowMs)
    const { success, remaining, reset } = await limiter.limit(key)
    return { allowed: success, remaining, resetAt: reset }
  } catch {
    // Degrade gracefully to in-memory if Redis is unreachable
    return inMemoryCheck(key, limit, windowMs)
  }
}

export function rateLimitResponse(resetAt: number) {
  return new Response(
    JSON.stringify({
      error: {
        code:    "RATE_LIMITED",
        message: "Muitas tentativas. Aguarde um momento e tente novamente.",
      },
    }),
    {
      status:  429,
      headers: {
        "Content-Type":        "application/json",
        "Retry-After":         String(Math.ceil((resetAt - Date.now()) / 1000)),
        "X-RateLimit-Remaining": "0",
      },
    },
  )
}
