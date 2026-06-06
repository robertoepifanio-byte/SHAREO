import type { NextRequest } from "next/server"
import { handlers } from "@/lib/auth"
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit"

export const { GET } = handlers

/**
 * Wraps NextAuth's POST to add rate limiting on the credentials login endpoint.
 * NextAuth's authorize() callback doesn't reliably receive the Request object
 * across all deployment environments, so we intercept here instead.
 *
 * Limits: 10 attempts/min per IP (brute force) + 5 attempts/5min per email (account targeting).
 */
export async function POST(req: NextRequest) {
  const url = new URL(req.url)

  if (url.pathname.endsWith("/callback/credentials")) {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      req.headers.get("x-real-ip") ??
      "unknown"

    const rlIp = await checkRateLimit(`login:ip:${ip}`, 10, 60_000, req)
    if (!rlIp.allowed) return rateLimitResponse(rlIp.resetAt)

    // Rate limit por email (protege conta específica contra ataques direcionados)
    try {
      const body  = await req.clone().text()
      const email = new URLSearchParams(body).get("email")?.toLowerCase()
      if (email) {
        const rlEmail = await checkRateLimit(`login:email:${email}`, 5, 5 * 60_000, req)
        if (!rlEmail.allowed) return rateLimitResponse(rlEmail.resetAt)
      }
    } catch {
      // Se não conseguir ler o body, continua sem rate limit por email
    }
  }

  return handlers.POST(req)
}
