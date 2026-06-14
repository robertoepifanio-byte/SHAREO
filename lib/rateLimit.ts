/**
 * Async rate limiter with Upstash Redis (production) + in-memory fallback (dev/test).
 *
 * When UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set, uses Upstash
 * sliding-window algorithm shared across all Vercel instances.
 * Otherwise falls back to a per-process Map (acceptable for dev/staging).
 *
 * ⚠️ NODE.JS RUNTIME ONLY (ARQ-Mi-11). Usa os SDKs @upstash/ratelimit + @upstash/redis,
 * que dependem de APIs Node e são incompatíveis com o Edge Runtime. NÃO importar este
 * módulo em rota/middleware com `runtime = "edge"` — o build quebra. Para rate limit no
 * Edge, reimplementar via fetch à REST do Upstash (padrão de lib/redis-admin-blocklist.ts).
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

// ─── Limites nomeados por endpoint ────────────────────────────────────────────
// Fonte única dos rate limits da aplicação. Ajustar aqui — não nos endpoints.

export const RATE_LIMITS = {
  register:       { limit: 5,  windowMs: 60_000 },              // 5/min por IP
  loginIp:        { limit: 10, windowMs: 60_000 },              // 10/min por IP
  loginEmail:     { limit: 5,  windowMs: 5 * 60_000 },          // 5/5min por e-mail
  mobileLogin:    { limit: 10, windowMs: 60_000 },              // 10/min por IP
  forgotPassword: { limit: 3,  windowMs: 60_000 },              // 3/min por IP
  resetPassword:  { limit: 10, windowMs: 60_000 },              // 10/min por IP
  resendVerify:   { limit: 3,  windowMs: 3_600_000 },           // 3/h por usuário
  emailChange:    { limit: 3,  windowMs: 60 * 60 * 1000 },      // 3/h por usuário
  passwordChange: { limit: 5,  windowMs: 15 * 60 * 1000 },      // 5/15min por usuário
  checkout:       { limit: 10, windowMs: 60_000 },              // 10/min por usuário
  upgradePj:      { limit: 5,  windowMs: 60_000 },              // 5/min por usuário
  pjWebhooks:     { limit: 10, windowMs: 60_000 },              // 10/min por usuário
  adminCreate:    { limit: 5,  windowMs: 24 * 60 * 60 * 1000 }, // 5/dia por admin
} as const

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
  req?: { headers: { get(name: string): string | null } },
): Promise<RateLimitResult> {
  if (process.env.SKIP_RATE_LIMIT === "true") {
    return { allowed: true, remaining: limit, resetAt: Date.now() + windowMs }
  }
  const e2eSecret = process.env.E2E_SECRET
  if (e2eSecret && req?.headers.get("x-e2e-token") === e2eSecret) {
    return { allowed: true, remaining: limit, resetAt: Date.now() + windowMs }
  }
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
