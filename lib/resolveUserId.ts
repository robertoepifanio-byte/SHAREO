import type { NextRequest } from "next/server"
import { jwtVerify } from "jose"
import { auth } from "@/lib/auth"

/** Resolves user ID from mobile Bearer JWT or NextAuth session cookie. */
export async function resolveUserId(req: NextRequest): Promise<string | null> {
  const bearer = req.headers.get("authorization")
  if (bearer?.startsWith("Bearer ")) {
    const token = bearer.slice(7)
    try {
      const key = new TextEncoder().encode(process.env.AUTH_SECRET ?? "")
      const { payload } = await jwtVerify(token, key)
      if (typeof payload.sub === "string") return payload.sub
    } catch {
      // fall through to session check
    }
  }
  const session = await auth()
  return session?.user?.id ?? null
}
