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
      const { payload } = await jwtVerify(token, key)
      if (typeof payload.sub === "string") {
        // GAP-CRIT-04b: rejeita token Bearer emitido antes de troca de senha/e-mail
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
