/**
 * GET /api/admin/export/repasses
 * Exportação CSV da tela /admin/financeiro/repasses — mesmos filtros
 * (q, status, from, to, via lib/payout-filters.ts), uma linha por `Payout`
 * (não por reserva: uma reserva com extensão paga à parte tem 2 Payouts, um
 * por cobrança — ATOR-03).
 *
 * "valor pago"/"tx Stripe"/"Comissão Shareo" vêm da RESERVA (campos
 * agregados por reserva, não por cobrança individual — o schema não separa
 * taxa/tx Stripe por cobrança) e por isso se repetem nas 2 linhas do caso de
 * extensão; só "Valor proprietário" reflete o valor exato daquele Payout.
 */
import { NextResponse, type NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireAdminRole } from "@/lib/auth/admin-guards"
import { auditLog } from "@/lib/audit"
import { toCsv, centsToCsvDecimal, CSV_BOM } from "@/lib/csv"
import { PAYOUT_STATUS_LABEL } from "@/lib/payout-status"
import { parsePayoutFilters } from "@/lib/payout-filters"

export const runtime = "nodejs"

// Teto do CSV — bem acima do take:200 da tela, mas ainda finito. Diferente da
// tela (que sinaliza corte com "200+"), um CSV cortado em silêncio é pior:
// parece completo pra quem for reconciliar com a Stripe. Por isso, ao bater
// o teto, RECUSA em vez de truncar — mesmo padrão de MAX_DAYS_TOTAL em
// app/api/admin/export/route.ts (pede pra estreitar o período, não entrega
// parcial calado).
const MAX_ROWS = 2000

export async function GET(req: NextRequest) {
  const session = await auth()
  try {
    requireAdminRole(session, "ADMIN_SUPERADMIN", "ADMIN_FINANCEIRO")
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const params = req.nextUrl.searchParams
  const { q, status, from, to, where } = parsePayoutFilters({
    q:      params.get("q"),
    status: params.get("status"),
    from:   params.get("from"),
    to:     params.get("to"),
  })

  const total = await prisma.payout.count({ where })
  if (total > MAX_ROWS) {
    return NextResponse.json(
      { error: `Resultado tem ${total} repasses — acima do teto de ${MAX_ROWS} para exportação. Estreite o período (De/Até) ou o filtro de status.` },
      { status: 422 },
    )
  }

  const payouts = await prisma.payout.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take:    MAX_ROWS,
    select: {
      id:                    true,
      amount:                true,
      status:                true,
      eligibleAfter:         true,
      processedAt:           true,
      createdAt:             true,
      booking: {
        select: {
          id:               true,
          totalPrice:       true,
          stripeFee:        true,
          platformFeeAmount: true,
          item:             { select: { title: true } },
        },
      },
      ownerPaymentAccount: {
        select: { user: { select: { name: true, email: true } } },
      },
    },
  })

  const rows = payouts.map((p) => ({
    "data":                p.createdAt.toISOString().slice(0, 10),
    "cod locação":         p.booking.id,
    "descrição":           p.booking.item.title,
    "valor pago":          centsToCsvDecimal(p.booking.totalPrice),
    "tx Stripe":           centsToCsvDecimal(p.booking.stripeFee),
    "Comissão Shareo":     centsToCsvDecimal(p.booking.platformFeeAmount),
    "Valor proprietário":  centsToCsvDecimal(p.amount),
    proprietario:          p.ownerPaymentAccount.user.name ?? "",
    email_proprietario:    p.ownerPaymentAccount.user.email,
    status_repasse:        PAYOUT_STATUS_LABEL[p.status],
    elegivel_desde:        p.eligibleAfter.toISOString().slice(0, 10),
    processado_em:         p.processedAt ? p.processedAt.toISOString().slice(0, 10) : "",
  }))

  // BOM: sem ele o Excel pt-BR abre em ANSI e "descrição"/"Comissão" viram lixo.
  const csv      = CSV_BOM + toCsv(rows)
  const filename = `shareo-repasses-${new Date().toISOString().slice(0, 10)}.csv`

  auditLog(session!.user.id, "EXPORT_FINANCIAL", "Payout", "list", {
    q, status: status ?? null, from: from || null, to: to || null, rows: rows.length,
  })

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type":        "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control":       "no-store",
    },
  })
}
