/**
 * GET /api/cron/ambassador-decay
 * Cron mensal (1º do mês 11h UTC): expira Referrals ACTIVE cujo indicado não
 * teve reserva paga nos últimos 12 meses. Recalcula tier dos embaixadores afetados.
 * Autenticado via CRON_SECRET (ADR-013).
 */
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { expireStaleReferrals } from "@/lib/ambassador"
import { assertCronAuth } from "@/lib/auth/cron-guard"

export async function GET(req: NextRequest) {
  const denied = assertCronAuth(req)
  if (denied) return denied

  try {
    const affectedReferrers = await expireStaleReferrals()
    console.warn(`[ambassador-decay] expired referrals from ${affectedReferrers.length} ambassadors`)
    return NextResponse.json({ ok: true, affectedAmbassadors: affectedReferrers.length })
  } catch (e) {
    console.error("[ambassador-decay] error:", e instanceof Error ? e.message : e)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
