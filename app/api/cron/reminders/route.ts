/**
 * GET /api/cron/reminders
 * Executado diariamente às 08:00 BRT (11:00 UTC) via Vercel Cron.
 * Envia lembretes automáticos de reservas ao proprietário e locatário.
 */
import { NextResponse, after, type NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { assertCronAuth } from "@/lib/auth/cron-guard"
import {
  sendReminderStartTomorrow,
  sendReminderReturnTomorrow,
  sendReminderOverdue,
  bookingItemsLabel,
} from "@/lib/email"
import { getLateFeeMultiplier, calcLateFee } from "@/lib/platform-config"
import {
  emitirCobrancaTaxaAtraso, precisaCobrar, diasDeAtraso, diasParaCalculo,
  TETO_DIAS_CALCULO_AUTOMATICO,
} from "@/lib/lateFee"

export const runtime = "nodejs"
export const maxDuration = 60

const BATCH_SIZE = 10

function startOfDay(d: Date) {
  const r = new Date(d)
  r.setUTCHours(0, 0, 0, 0)
  return r
}
function endOfDay(d: Date) {
  const r = new Date(d)
  r.setUTCHours(23, 59, 59, 999)
  return r
}

// Processa items em lotes para evitar explodir o pool de conexões.
// Paralelo dentro do lote, sequencial entre lotes.
async function processInBatches<T>(
  items: T[],
  batchSize: number,
  fn: (item: T) => Promise<void>,
): Promise<{ ok: number; failed: number }> {
  let ok = 0, failed = 0
  for (let i = 0; i < items.length; i += batchSize) {
    const chunk = items.slice(i, i + batchSize)
    const results = await Promise.allSettled(chunk.map(fn))
    for (const r of results) {
      if (r.status === "fulfilled") ok++
      else failed++
    }
  }
  return { ok, failed }
}

export async function GET(req: NextRequest) {
  const denied = assertCronAuth(req)
  if (denied) return denied

  const lateFeeMultiplier = await getLateFeeMultiplier()

  const today    = new Date()
  const tomorrow = new Date(today); tomorrow.setUTCDate(today.getUTCDate() + 1)

  const [startReminders, returnReminders, overdueBookings, multasEmAberto] = await Promise.all([
    // Reservas que começam amanhã (CONFIRMED ou ACTIVE)
    prisma.booking.findMany({
      where: {
        status:    { in: ["CONFIRMED", "ACTIVE"] },
        startDate: { gte: startOfDay(tomorrow), lte: endOfDay(tomorrow) },
        deletedAt: null,
      },
      select: {
        id: true, startDate: true, endDate: true, totalDays: true,
        item:     { select: { title: true } },
        borrower: { select: { email: true, name: true } },
        owner:    { select: { email: true, name: true } },
        _count:   { select: { bookingItems: true } },
      },
    }),

    // Reservas que vencem amanhã (ACTIVE)
    prisma.booking.findMany({
      where: {
        status:  "ACTIVE",
        endDate: { gte: startOfDay(tomorrow), lte: endOfDay(tomorrow) },
        deletedAt: null,
      },
      select: {
        id: true, startDate: true, endDate: true,
        item:     { select: { title: true } },
        borrower: { select: { email: true, name: true } },
        owner:    { select: { email: true, name: true } },
        _count:   { select: { bookingItems: true } },
      },
    }),

    // Reservas em atraso (ACTIVE e endDate < hoje)
    prisma.booking.findMany({
      where: {
        status:    "ACTIVE",
        endDate:   { lt: startOfDay(today) },
        deletedAt: null,
      },
      select: {
        id: true, startDate: true, endDate: true, dailyPrice: true,
        lateFeeAmount: true, lateFeePaymentIntentId: true,
        lateFeeSessionId: true, lateFeeSessionExpiresAt: true,
        borrowerId: true, ownerId: true, // aviso do teto da multa
        item:     { select: { title: true, images: { select: { url: true }, orderBy: { order: "asc" }, take: 1 } } },
        borrower: { select: { email: true, name: true } },
        owner:    { select: { email: true, name: true } },
        _count:   { select: { bookingItems: true } },
      },
    }),

    // 🪤 Multa em aberto numa reserva que JÁ SAIU de ACTIVE.
    //
    // A devolução tira a reserva da consulta acima, mas não quita nada: o caso
    // real do staging (01/09) é exatamente este — item devolvido, locação
    // concluída, multa de R$ 7,50 nunca paga e a cobrança expirada. Sem esta
    // segunda consulta a dívida ficaria fora do alcance do cron para sempre.
    //
    // CANCELLED fica de fora de propósito: reserva cancelada não gera multa a
    // cobrar. Aqui NÃO sai lembrete de atraso — só a cobrança é reemitida.
    prisma.booking.findMany({
      where: {
        status:                  { in: ["RETURNED", "COMPLETED"] },
        lateFeeAmount:           { gt: 0 },
        lateFeePaymentIntentId:  null,
        deletedAt:               null,
        OR: [
          { lateFeeSessionExpiresAt: null },
          { lateFeeSessionExpiresAt: { lt: today } },
        ],
      },
      select: {
        id: true, endDate: true, dailyPrice: true,
        // 🪤 Quando o item voltou: e a data em que a multa PAROU de crescer.
        returnRequestedAt: true, returnedAt: true,
        lateFeeAmount: true, lateFeePaymentIntentId: true,
        lateFeeSessionId: true, lateFeeSessionExpiresAt: true,
        item:     { select: { title: true, images: { select: { url: true }, orderBy: { order: "asc" }, take: 1 } } },
        borrower: { select: { email: true, name: true } },
        _count:   { select: { bookingItems: true } },
      },
    }),
  ])

  const sent:   string[] = []
  const failed: string[] = []

  const startStats = await processInBatches(startReminders, BATCH_SIZE, async (b) => {
    try {
      await sendReminderStartTomorrow(
        b.borrower.email, b.borrower.name,
        b.owner.email,    b.owner.name,
        bookingItemsLabel(b.item.title, b._count.bookingItems || 1), b.id,
        b.startDate,
      )
      sent.push(`start:${b.id}`)
    } catch (e) {
      console.error("[cron] start reminder", b.id, e)
      failed.push(`start:${b.id}`)
      throw e
    }
  })

  const returnStats = await processInBatches(returnReminders, BATCH_SIZE, async (b) => {
    try {
      await sendReminderReturnTomorrow(
        b.borrower.email, b.borrower.name,
        bookingItemsLabel(b.item.title, b._count.bookingItems || 1), b.id,
        b.endDate,
      )
      sent.push(`return:${b.id}`)
    } catch (e) {
      console.error("[cron] return reminder", b.id, e)
      failed.push(`return:${b.id}`)
      throw e
    }
  })

  const overdueStats = await processInBatches(overdueBookings, BATCH_SIZE, async (b) => {
    // Item ainda não voltou: o atraso corre até hoje.
    const daysLate = diasDeAtraso(b.endDate, today)
    const itemsLabel = bookingItemsLabel(b.item.title, b._count.bookingItems || 1)

    // Cobrança da multa: primeira emissão OU reemissão, quando a anterior
    // expirou sem pagamento. Ordem dentro de uma mesma reserva é intencional —
    // não paralelizar.
    //
    // 🪤 Antes a condição era `if (b.lateFeeAmount == null)` — cobrava UMA vez
    // na vida. Como a sessão da Stripe vale 24h, quem não pagasse nesse prazo
    // ficava sem forma de pagar para sempre, e seguia recebendo o lembrete
    // diário de atraso sem link. Os 5 casos cobrados no staging expiraram
    // todos assim.
    //
    // O item ainda não voltou, então a multa cresce: o valor é recalculado com
    // os dias de atraso de HOJE — até o teto de 30 dias (decisão de Roberto,
    // 01/09). Passado o teto o valor congela no do 30º dia e só o admin move.
    const diasCobrados = diasParaCalculo(daysLate)
    const valorHoje    = calcLateFee(b.dailyPrice, lateFeeMultiplier, diasCobrados)

    // Aviso único, no dia em que o teto é atingido: as duas partes precisam
    // saber que o caso saiu do automático e passou a ser extravio, não atraso.
    if (daysLate === TETO_DIAS_CALCULO_AUTOMATICO + 1) {
      after(() =>
        prisma.notification.createMany({
          data: [b.borrower, b.owner].map((_, i) => ({
            userId: i === 0 ? b.borrowerId : b.ownerId,
            type:   "LATE_FEE_APPLIED" as never,
            title:  "Taxa de atraso deixou de crescer",
            body:   `"${itemsLabel}" está há mais de ${TETO_DIAS_CALCULO_AUTOMATICO} dias sem devolução. ` +
                    `A taxa parou de aumentar e o caso deve seguir como extravio — abra uma disputa na reserva.`,
            data:   { bookingId: b.id },
          })),
        }).catch((e) => console.error("[cron] aviso de teto da multa:", e instanceof Error ? e.message : e))
      )
    }

    if (precisaCobrar(b, valorHoje)) {
      try {
        const r = await emitirCobrancaTaxaAtraso(
          b,
          itemsLabel,
          valorHoje,
          `${diasCobrados} dia${diasCobrados > 1 ? "s" : ""} em atraso`,
        )
        if (r.emitida) sent.push(`late_fee${r.reemissao ? ":reemitida" : ""}:${b.id}`)
      } catch (e) {
        console.error("[cron] late fee charge", b.id, e instanceof Error ? e.message : e)
        failed.push(`late_fee:${b.id}`)
        // Não propaga — o lembrete diário de atraso continua mesmo se a cobrança falhar.
        // E, ao contrário de antes, a falha não queima a única chance: sem
        // sessão viva gravada, o cron de amanhã tenta de novo.
      }
    }

    // Lembrete diário de atraso (independente de já ter cobrado)
    try {
      await sendReminderOverdue(
        b.borrower.email, b.borrower.name,
        b.owner.email,    b.owner.name,
        itemsLabel,       b.id,
        b.endDate,        daysLate,
        b.dailyPrice,     lateFeeMultiplier,
      )
      sent.push(`overdue:${b.id}`)
    } catch (e) {
      console.error("[cron] overdue reminder", b.id, e)
      failed.push(`overdue:${b.id}`)
      throw e
    }
  })

  // Reemissão para reservas já devolvidas — só a cobrança, sem lembrete de
  // atraso: o item já voltou, cobrar atraso agora seria desinformação.
  const reemissaoStats = await processInBatches(multasEmAberto, BATCH_SIZE, async (b) => {
    // 🪤 Aqui o item JÁ VOLTOU, então a multa parou de crescer. A referência é
    // a devolução, não hoje — usar `today` faria a dívida de uma locação
    // concluída aumentar todo dia, para sempre, enquanto não fosse paga.
    // `returnRequestedAt` é quando o locatário devolveu; `returnedAt`, quando o
    // locador confirmou. O atraso termina no primeiro.
    const fimDoAtraso = b.returnRequestedAt ?? b.returnedAt ?? today
    const diasAtraso  = diasDeAtraso(b.endDate, fimDoAtraso)
    try {
      const r = await emitirCobrancaTaxaAtraso(
        b,
        bookingItemsLabel(b.item.title, b._count.bookingItems || 1),
        calcLateFee(b.dailyPrice, lateFeeMultiplier, diasAtraso),
        `${diasAtraso} dia${diasAtraso > 1 ? "s" : ""} em atraso`,
      )
      if (r.emitida) sent.push(`late_fee:reemitida:${b.id}`)
    } catch (e) {
      console.error("[cron] reemissão de multa", b.id, e instanceof Error ? e.message : e)
      failed.push(`late_fee:reemissao:${b.id}`)
      throw e
    }
  })

  console.warn(
    `[cron/reminders] start=${startStats.ok}ok/${startStats.failed}fail` +
    ` return=${returnStats.ok}ok/${returnStats.failed}fail` +
    ` overdue=${overdueStats.ok}ok/${overdueStats.failed}fail` +
    ` reemissao=${reemissaoStats.ok}ok/${reemissaoStats.failed}fail`,
    { sent, failed },
  )

  return NextResponse.json({
    ok:        true,
    sent:      sent.length,
    failed:    failed.length,
    ids:       sent,
    failedIds: failed,
  })
}
