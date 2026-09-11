import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { requireAdminRole } from "@/lib/auth/admin-guards"
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit"
import { comCors, respostaPreflight } from "@/lib/cors-campanha"
import { incrementFunnelEvent, readFunnelCounts } from "@/lib/founderFunnel"

const Schema = z.object({
  event: z.enum(["view", "submit_attempt"]),
})

/**
 * Contador de funil da captação de Fundadores — ver `lib/founderFunnel.ts`
 * para o porquê de existir em vez de religar o GA4.
 *
 * Mesma topologia cross-origin de `/api/founders/leads`: a landing da
 * campanha (apps/campanha) posta direto do navegador.
 */
export async function OPTIONS(req: NextRequest) {
  return respostaPreflight(req.headers.get("origin"))
}

export async function POST(req: NextRequest) {
  return comCors(await handlePost(req), req.headers.get("origin"))
}

async function handlePost(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
           ?? req.headers.get("x-real-ip") ?? "unknown"
    const rl = await checkRateLimit(
      `founders-funnel:${ip}`,
      RATE_LIMITS.foundersFunnel.limit,
      RATE_LIMITS.foundersFunnel.windowMs,
      req,
    )
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const body   = await req.json().catch(() => null)
    const parsed = Schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR" } }, { status: 400 })
    }

    // Fire-and-forget de propósito: um INCR perdido não deve virar erro visível
    // para o visitante nem atrasar a resposta.
    await incrementFunnelEvent(parsed.data.event)

    return NextResponse.json({ data: { ok: true } }, { status: 202 })
  } catch (e) {
    console.error("[POST /api/founders/funnel]", e instanceof Error ? e.message : e)
    // Nunca 500 para o visitante por causa de um contador — devolve 202 do
    // mesmo jeito. Quem chama já ignora a resposta.
    return NextResponse.json({ data: { ok: false } }, { status: 202 })
  }
}

/**
 * Admin-only: expõe contagem por dia, não é a prova social pública (essa
 * continua em /api/founders/stats). Números agregados, mas ainda assim
 * revelam taxa de erro/abandono — não é para o público.
 */
export async function GET(req: NextRequest) {
  const session = await auth()
  try {
    requireAdminRole(session, "ADMIN_SUPERADMIN", "ADMIN_FINANCEIRO", "ADMIN_OPERACIONAL")
  } catch {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
  }

  const daysParam = req.nextUrl.searchParams.get("days")
  const days = Math.min(Math.max(parseInt(daysParam ?? "14", 10) || 14, 1), 90)

  const counts = await readFunnelCounts(days)
  return NextResponse.json({ data: counts })
}
