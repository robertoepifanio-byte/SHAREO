/**
 * GET /api/cron/payout
 * Executado diariamente às 10:00 BRT (13:00 UTC) via Vercel Cron.
 *
 * Split real via Stripe Connect (ADR-028): quando o proprietário tem conta
 * Connect ativa (`stripeConnectStatus === "ACTIVE"`), cria um Transfer real
 * pra `stripeAccountId` dele e marca o Payout como COMPLETED — sem
 * intervenção humana. Proprietários que ainda não conectaram (ou cuja
 * conta não está ativa) caem no comportamento anterior: PROCESSING pra
 * execução manual via PIX pelo ADMIN_FINANCEIRO.
 *
 * O Transfer usa `source_transaction` (obrigatório pra transferências
 * envolvendo o Brasil — doc da Stripe) ligando a transferência à cobrança
 * original, e `transfer_group` = bookingId (mesmo grupo já setado na
 * Checkout Session em app/api/payments/checkout/route.ts).
 */
import { NextResponse, type NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { assertCronAuth } from "@/lib/auth/cron-guard"
import { getStripe } from "@/lib/stripe"

export const runtime    = "nodejs"
export const maxDuration = 60

const BATCH_SIZE = 10

export async function GET(req: NextRequest) {
  const denied = assertCronAuth(req)
  if (denied) return denied

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
        select: { id: true, stripePaymentIntentId: true, item: { select: { title: true } } },
      },
      ownerPaymentAccount: {
        select: {
          pixKey: true, pixKeyType: true, holderName: true,
          stripeAccountId: true, stripeConnectStatus: true,
        },
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

    const canTransfer =
      payout.ownerPaymentAccount.stripeAccountId &&
      payout.ownerPaymentAccount.stripeConnectStatus === "ACTIVE"

    try {
      if (canTransfer && payout.booking.stripePaymentIntentId) {
        const stripe = getStripe()
        const paymentIntent = await stripe.paymentIntents.retrieve(payout.booking.stripePaymentIntentId)
        const chargeId = typeof paymentIntent.latest_charge === "string"
          ? paymentIntent.latest_charge
          : paymentIntent.latest_charge?.id

        if (!chargeId) throw new Error("PaymentIntent sem latest_charge — não é possível criar o Transfer.")

        // idempotencyKey por payout.id: se o cron reprocessar por causa de um
        // timeout de rede depois do Transfer já ter sido criado na Stripe, a
        // segunda chamada retorna o Transfer original em vez de duplicar.
        const transfer = await stripe.transfers.create(
          {
            amount:             payout.amount,
            currency:           "brl",
            destination:        payout.ownerPaymentAccount.stripeAccountId!,
            source_transaction: chargeId,
            transfer_group:     payout.booking.id,
          },
          { idempotencyKey: `payout-transfer-${payout.id}` },
        )

        await prisma.$transaction([
          prisma.payout.update({
            where: { id: payout.id },
            data:  { status: "COMPLETED", processedAt: new Date() },
          }),
          prisma.platformTransaction.create({
            data: {
              bookingId:   payout.booking.id,
              type:        "OWNER_PAYOUT",
              amount:      payout.amount,
              description: `Transfer Stripe Connect para ${payout.ownerPaymentAccount.stripeAccountId}`,
              metadata:    { stripeTransferId: transfer.id },
            },
          }),
        ])

        console.warn(`[cron/payout] COMPLETED (Stripe Connect) id=${payout.id} transfer=${transfer.id} amount=${payout.amount}`)
      } else {
        // Fallback: proprietário sem Connect ativo — execução manual via PIX
        // (comportamento original, V1+ era a integração automática — agora
        // é automática só pra quem já conectou o Stripe).
        // SEC-CRIT-04: NÃO logar a chave PIX em texto claro (PII/financeiro, LGPD).
        const pixTail = String(payout.ownerPaymentAccount.pixKey ?? "").slice(-4)
        console.warn(
          `[cron/payout] PROCESSING (PIX manual) id=${payout.id} amount=${payout.amount} ` +
          `booking=${payout.booking.id} pix=***${pixTail}`,
        )
      }
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
