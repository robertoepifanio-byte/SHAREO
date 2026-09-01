/**
 * POST /api/admin/export
 * Exportação financeira (ADR-016):
 *  - ≤ 90 dias → CSV síncrono (download imediato)
 *  - > 90 dias → job assíncrono, retorna 202 com jobId
 *
 * Query params (para GET síncrono via URL):
 *  start  ISO date  ex.: 2026-01-01
 *  end    ISO date  ex.: 2026-03-31
 *
 * Body params (POST):
 *  { start: string, end: string }
 */
import { NextResponse, after, type NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireAdminRole } from "@/lib/auth/admin-guards"
import { auditLog } from "@/lib/audit"
import { sendExportReadyEmail } from "@/lib/email"
// toCsv vivia aqui como função local; foi extraído para lib/csv.ts quando a
// exportação de interessados da campanha passou a precisar do mesmo escape
// (incluindo a proteção contra formula injection, S14-SEC-06).
import { toCsv, centsToCsvDecimal, CSV_BOM } from "@/lib/csv"
import { PAYOUT_STATUS_LABEL } from "@/lib/payout-status"
import type { PayoutStatus } from "@prisma/client"

export const runtime = "nodejs"

const MAX_DAYS_SYNC  = 90
const MAX_DAYS_TOTAL = 5 * 365 // ADR-017: 5 anos

/**
 * Resumo do(s) `Payout` de uma reserva — normalmente 1, mas pode ser 2 quando
 * há extensão de prazo paga à parte (ATOR-03, um Payout por cobrança). Sem
 * essa junção o CSV mostrava o valor CALCULADO do repasse, nunca se ele
 * realmente saiu — pedido do fundador para auditoria de verdade.
 */
function resumoRepasse(payouts: { status: PayoutStatus; processedAt: Date | null }[]): string {
  if (payouts.length === 0) return "—"
  if (payouts.every((p) => p.status === "COMPLETED")) return PAYOUT_STATUS_LABEL.COMPLETED
  if (payouts.some((p) => p.status === "FAILED" || p.status === "BLOCKED")) {
    return payouts.map((p) => PAYOUT_STATUS_LABEL[p.status]).join(" + ")
  }
  return PAYOUT_STATUS_LABEL[payouts[0].status]
}

async function fetchRows(start: Date, end: Date) {
  const bookings = await prisma.booking.findMany({
    where: {
      // Reserva em disputa nao fica mais num status proprio: ela segue
      // ACTIVE/RETURNED. Entra no export pelo `disputeStatus`, senao
      // sumiria justamente do relatorio que existe para acompanha-la.
      OR: [
        { status: { in: ["COMPLETED", "CANCELLED"] } },
        { disputeStatus: { not: "NONE" } },
      ],
      createdAt: { gte: start, lte: end },
    },
    orderBy: { createdAt: "asc" },
    select: {
      id:               true,
      createdAt:        true,
      status:           true,
      paymentStatus:    true,
      totalPrice:       true,
      platformFeeRate:  true,
      platformFeeAmount: true,
      ownerNetAmount:   true,
      stripeFee:        true,
      stripeDisputeId:  true,
      item:             { select: { title: true } },
      owner:            { select: { name: true, email: true } },
      borrower:         { select: { name: true, email: true } },
      payouts:          { select: { status: true, processedAt: true } },
    },
  })

  return bookings.map((b) => ({
    "data":                b.createdAt.toISOString().slice(0, 10),
    "cod locação":         b.id,
    "descrição":           b.item.title,
    "valor pago":          centsToCsvDecimal(b.totalPrice),
    "tx Stripe":           centsToCsvDecimal(b.stripeFee),
    "Comissão Shareo":     centsToCsvDecimal(b.platformFeeAmount),
    "Valor proprietário":  centsToCsvDecimal(b.ownerNetAmount),
    status:                b.status,
    pagamento:             b.paymentStatus,
    proprietario:          b.owner.name ?? "",
    email_proprietario:    b.owner.email,
    locatario:             b.borrower.name ?? "",
    email_locatario:       b.borrower.email,
    taxa_pct:              b.platformFeeRate != null ? (b.platformFeeRate / 100).toFixed(2) + "%" : "",
    status_repasse:        resumoRepasse(b.payouts),
    dispute_id:            b.stripeDisputeId ?? "",
  }))
}

export async function POST(req: NextRequest) {
  const session = await auth()
  try {
    requireAdminRole(session, "ADMIN_SUPERADMIN", "ADMIN_FINANCEIRO")
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const startStr = body?.start as string | undefined
  const endStr   = body?.end   as string | undefined

  if (!startStr || !endStr) {
    return NextResponse.json({ error: "Parâmetros start e end são obrigatórios" }, { status: 400 })
  }

  const start = new Date(startStr)
  const end   = new Date(endStr)
  end.setHours(23, 59, 59, 999)

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return NextResponse.json({ error: "Datas inválidas" }, { status: 400 })
  }
  if (start > end) {
    return NextResponse.json({ error: "start deve ser anterior a end" }, { status: 400 })
  }

  const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays > MAX_DAYS_TOTAL) {
    return NextResponse.json(
      { error: `Período máximo é de ${MAX_DAYS_TOTAL} dias (5 anos)` },
      { status: 422 },
    )
  }

  const adminId = session!.user.id

  // ── Síncrono: ≤ 90 dias ──────────────────────────────────────────────────
  if (diffDays <= MAX_DAYS_SYNC) {
    const rows = await fetchRows(start, end)
    // BOM: sem ele o Excel pt-BR abre em ANSI e "descrição"/"Comissão" viram lixo.
    const csv  = CSV_BOM + toCsv(rows)

    const filename = `shareo-financeiro-${startStr}-${endStr}.csv`

    auditLog(adminId, "EXPORT_FINANCIAL", "ExportJob", "sync", {
      start: startStr, end: endStr, rows: rows.length,
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

  // ── Assíncrono: > 90 dias ────────────────────────────────────────────────
  const job = await prisma.exportJob.create({
    data: {
      requestedBy: adminId,
      periodStart: start,
      periodEnd:   end,
      status:      "PENDING",
    },
  })

  auditLog(adminId, "EXPORT_FINANCIAL", "ExportJob", job.id, {
    start: startStr, end: endStr, async: true,
  })

  // Processa em background com after() — fire-and-forget puro morre quando a lambda congela
  // V1+: mover para Vercel Background Function ou Inngest
  after(() =>
    processExportJobAsync(job.id, start, end, adminId).catch((e) =>
      console.error("[export] async job failed:", e instanceof Error ? e.message : e),
    )
  )

  return NextResponse.json({ jobId: job.id, status: "PENDING" }, { status: 202 })
}

async function processExportJobAsync(
  jobId: string,
  start: Date,
  end: Date,
  adminId: string,
) {
  await prisma.exportJob.update({ where: { id: jobId }, data: { status: "PROCESSING" } })

  try {
    const rows = await fetchRows(start, end)
    const csv  = CSV_BOM + toCsv(rows)

    // MVP: salva como data URL base64 (sem Supabase Storage configurado para exports)
    // V1+: upload para Supabase Storage + URL assinada por 48h
    const base64 = Buffer.from(csv, "utf-8").toString("base64")
    const dataUrl = `data:text/csv;base64,${base64}`

    await prisma.exportJob.update({
      where: { id: jobId },
      data:  { status: "COMPLETED", fileUrl: dataUrl },
    })

    // ADR-016: notificar o admin por e-mail quando a exportação assíncrona conclui
    const admin = await prisma.user.findUnique({
      where:  { id: adminId },
      select: { email: true, name: true },
    })
    if (admin) {
      await sendExportReadyEmail(admin.email, admin.name ?? "Admin", start, end).catch((e) =>
        console.error("[export] notify email failed:", e instanceof Error ? e.message : e),
      )
    }

    console.warn(`[export] job ${jobId} completed — ${rows.length} rows`)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido"
    await prisma.exportJob.update({
      where: { id: jobId },
      data:  { status: "FAILED", errorMessage: msg },
    })
    throw e
  }
}
