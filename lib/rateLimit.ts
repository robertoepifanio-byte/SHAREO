/**
 * Sliding-window in-memory rate limiter.
 * Works per-process (not shared across Vercel instances), which is acceptable
 * for a staging/MVP environment. Replace with Upstash Redis for production scale.
 */

const store = new Map<string, number[]>()

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number // epoch ms
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now()
  const timestamps = (store.get(key) ?? []).filter((t) => now - t < windowMs)

  if (timestamps.length >= limit) {
    const oldest = Math.min(...timestamps)
    return { allowed: false, remaining: 0, resetAt: oldest + windowMs }
  }

  timestamps.push(now)
  store.set(key, timestamps)

  // 1% chance to sweep expired entries and prevent memory growth
  if (Math.random() < 0.01) {
    for (const [k, v] of store.entries()) {
      if (v.every((t) => now - t >= windowMs)) store.delete(k)
    }
  }

  return { allowed: true, remaining: limit - timestamps.length, resetAt: now + windowMs }
}

export function rateLimitResponse(resetAt: number) {
  return new Response(
    JSON.stringify({
      error: {
        code: "RATE_LIMITED",
        message: "Muitas tentativas. Aguarde um momento e tente novamente.",
      },
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)),
        "X-RateLimit-Remaining": "0",
      },
    },
  )
}
