/**
 * GET /api/cron/ambassador-decay
 * Cron mensal (1º do mês 11h UTC): expira Referrals ACTIVE cujo indicado não
 * teve reserva paga nos últimos 12 meses. Recalcula tier dos embaixadores afetados.
 * Autenticado via CRON_SECRET (ADR-013).
 */
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { expireStaleReferrals } from "@/lib/ambassador"

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret")
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const affectedReferrers = await expireStaleReferrals()
    console.warn(`[ambassador-decay] expired referrals from ${affectedReferrers.length} ambassadors`)
    return NextResponse.json({ ok: true, affectedAmbassadors: affectedReferrers.length })
  } catch (e) {
    console.error("[ambassador-decay] error:", e instanceof Error ? e.message : e)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
