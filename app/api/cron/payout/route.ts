/**
 * GET /api/cron/payout
 * Executado diariamente às 10:00 BRT (13:00 UTC) via Vercel Cron.
 * MVP: marca repasses elegíveis como PROCESSING e notifica ADMIN_FINANCEIRO
 * para execução manual via PIX. Integração automática na V1+.
 */
import { NextResponse, type NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"

export const runtime    = "nodejs"
export const maxDuration = 60

const BATCH_SIZE = 10

export async function GET(req: NextRequest) {
  const auth   = req.headers.get("authorization")
  const secret = process.env.CRON_SECRET
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()
  let processed = 0
  let skipped   = 0
  let errors    = 0

  // Busca repasses elegíveis em lotes
  const candidates = await prisma.payout.findMany({
    where: {
      status:        "PENDING",
      eligibleAfter: { lte: now },
      booking: {
        status: { not: "DISPUTED" },
      },
    },
    take:    BATCH_SIZE,
    orderBy: { eligibleAfter: "asc" },
    select: {
      id:     true,
      amount: true,
      booking: {
        select: { id: true, item: { select: { title: true } } },
      },
      ownerPaymentAccount: {
        select: { pixKey: true, pixKeyType: true, holderName: true },
      },
    },
  })

  for (const payout of candidates) {
    // Optimistic lock — evita duplo processamento em execuções concorrentes
    const claimed = await prisma.payout.updateMany({
      where: { id: payout.id, status: "PENDING" },
      data:  { status: "PROCESSING" },
    })

    if (claimed.count === 0) {
      skipped++
      continue
    }

    try {
      // MVP: apenas registra como PROCESSING para execução manual pelo admin
      // V1+: chamar EFI Bank / Pagar.me aqui e atualizar para COMPLETED
      console.warn(
        `[cron/payout] PROCESSING id=${payout.id} amount=${payout.amount} ` +
        `booking=${payout.booking.id} pix=${payout.ownerPaymentAccount.pixKey}`,
      )
      processed++
    } catch (e) {
      errors++
      await prisma.payout.update({
        where: { id: payout.id },
        data:  {
          status:       "FAILED",
          failureReason: e instanceof Error ? e.message : "Erro desconhecido",
        },
      }).catch(() => null)
    }
  }

  // Notifica ADMIN_FINANCEIRO se houver repasses pendentes de execução manual
  if (processed > 0) {
    const pendingCount = await prisma.payout.count({ where: { status: "PROCESSING" } })
    if (pendingCount > 0) {
      console.warn(
        `[cron/payout] ${pendingCount} repasse(s) aguardando execução manual pelo ADMIN_FINANCEIRO`,
      )
      // TODO V1: enviar e-mail para ADMIN_FINANCEIRO com lista de repasses PROCESSING
    }
  }

  return NextResponse.json({
    ok:        true,
    processed,
    skipped,
    errors,
    timestamp: now.toISOString(),
  })
}
