import type { NextRequest } from "next/server"
import { handlers } from "@/lib/auth"
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit"
import { checkLoginEmailLimit } from "@/lib/loginRateLimit"

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

    const rlIp = await checkRateLimit(`login:ip:${ip}`, RATE_LIMITS.loginIp.limit, RATE_LIMITS.loginIp.windowMs, req)
    if (!rlIp.allowed) return rateLimitResponse(rlIp.resetAt)

    // Rate limit por email (protege conta específica contra ataques direcionados)
    try {
      const bloqueada = await checkLoginEmailLimit(await credentialsEmail(req), req)
      if (bloqueada) return bloqueada
    } catch {
      // Se não conseguir ler o body, continua sem rate limit por email
    }
  }

  return handlers.POST(req)
}

/**
 * E-mail do body: JSON ou formulário, como o @auth/core (aceita os dois; em
 * chave repetida fica com a ÚLTIMA). Formulário é o fallback para qualquer outro
 * content-type, um superconjunto do que o NextAuth lê.
 * 🪤 Ler a PRIMEIRA chave deixava o limite cego a `email=lixo&email=vitima@x.com`:
 * contava `lixo`, e o NextAuth autenticava `vitima@x.com`.
 */
async function credentialsEmail(req: NextRequest): Promise<unknown> {
  const body = await req.clone().text()
  const contentType = req.headers.get("content-type") ?? ""
  if (contentType.includes("application/json")) return JSON.parse(body)?.email
  const emails = new URLSearchParams(body).getAll("email")
  return emails[emails.length - 1]
}
