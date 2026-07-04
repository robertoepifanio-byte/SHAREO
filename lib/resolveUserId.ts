import type { NextRequest } from "next/server"
import { jwtVerify } from "jose"
import { auth } from "@/lib/auth"
import { isSessionStale } from "@/lib/redis-admin-blocklist"

/** Resolves user ID from mobile Bearer JWT or NextAuth session cookie. */
export async function resolveUserId(req: NextRequest): Promise<string | null> {
  const bearer = req.headers.get("authorization")
  if (bearer?.startsWith("Bearer ")) {
    const token = bearer.slice(7)
    try {
      const key = new TextEncoder().encode(process.env.AUTH_SECRET ?? "")
      // Pina HS256 (defesa em profundidade — o secret é simétrico).
      const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] })
      // SEC: refresh token (type:"refresh", 30d) NÃO pode agir como access token.
      // O app só o envia no body de /api/auth/mobile/refresh, nunca no header —
      // aceitá-lo aqui daria a um token vazado 30d de acesso em vez de 15min.
      if (typeof payload.sub === "string" && payload.type !== "refresh") {
        // GAP-CRIT-04b: rejeita token Bearer emitido antes de troca de senha/e-mail.
        // Bearer usa `iat` (renovado a cada refresh); o /refresh também checa isSessionStale
        // por `iat`, então a invalidação por epoch cobre access E refresh — não há bypass.
        const iat = typeof payload.iat === "number" ? payload.iat : undefined
        if (!(await isSessionStale(payload.sub, iat))) return payload.sub
      }
    } catch {
      // fall through to session check
    }
  }
  const session = await auth()
  return session?.user?.id ?? null
}
