import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { jwtVerify } from "jose"

// TEMPORÁRIO — diagnóstico do 401 em resolveUserId (booking "Solicitar locação").
// Remover após identificar a causa raiz.
export async function GET(req: NextRequest) {
  const bearer = req.headers.get("authorization")
  if (!bearer?.startsWith("Bearer ")) {
    return NextResponse.json({ step: "no-bearer-header" })
  }
  const token = bearer.slice(7)
  const secretPresent = !!process.env.AUTH_SECRET
  const secretLen = process.env.AUTH_SECRET?.length ?? 0

  try {
    const key = new TextEncoder().encode(process.env.AUTH_SECRET ?? "")
    const { payload } = await jwtVerify(token, key)

    const upstashUrl = process.env.UPSTASH_REDIS_REST_URL
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN
    let epochRaw: unknown = null
    let epochError: string | null = null

    if (upstashUrl && upstashToken && typeof payload.sub === "string") {
      try {
        const res = await fetch(upstashUrl, {
          method: "POST",
          headers: { Authorization: `Bearer ${upstashToken}`, "Content-Type": "application/json" },
          body: JSON.stringify(["GET", `session:epoch:${encodeURIComponent(payload.sub)}`]),
        })
        const json = await res.json() as { result: unknown }
        epochRaw = json.result
      } catch (e) {
        epochError = e instanceof Error ? e.message : String(e)
      }
    }

    const iat = typeof payload.iat === "number" ? payload.iat : null
    const epoch = epochRaw == null ? null : Number(epochRaw)
    const wouldBeStale = iat != null && epoch != null && Number.isFinite(epoch) ? iat < epoch : null

    return NextResponse.json({
      step: "verified",
      sub: payload.sub,
      iat,
      exp: payload.exp ?? null,
      nowSec: Math.floor(Date.now() / 1000),
      secretPresent,
      secretLen,
      upstashConfigured: !!(upstashUrl && upstashToken),
      epochRaw,
      epochError,
      wouldBeStale,
    })
  } catch (e) {
    return NextResponse.json({
      step: "jwtVerify-failed",
      error: e instanceof Error ? e.message : String(e),
      secretPresent,
      secretLen,
    })
  }
}
