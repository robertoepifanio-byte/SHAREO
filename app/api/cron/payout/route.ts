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
 * A mecânica do Transfer em si (source_transaction, transfer_group,
 * idempotência) fica em lib/payments/owner-transfer.ts.
 */
import { NextResponse, type NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { assertCronAuth } from "@/lib/auth/cron-guard"
import { getStripe, idOf } from "@/lib/stripe"
import { createOwnerTransfer } from "@/lib/payments/owner-transfer"

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
        // Segura o repasse só ENQUANTO a disputa está aberta. Antes isto lia
        // `status != DISPUTED`; agora a disputa é paralela ao ciclo de vida, e
        // uma disputa já encerrada (DISMISSED/RESOLVED_*) não pode continuar
        // travando dinheiro que tem dono.
        disputeStatus: { not: "OPEN" },
      },
    },
    take:    BATCH_SIZE,
    orderBy: { eligibleAfter: "asc" },
    select: {
      id:     true,
      amount: true,
      sourcePaymentIntentId: true,
      booking: {
        select: { id: true, stripePaymentIntentId: true },
      },
      ownerPaymentAccount: {
        select: { pixKey: true, stripeAccountId: true, stripeConnectStatus: true },
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

    const account   = payout.ownerPaymentAccount
    // A cobrança que financia ESTE repasse: a da extensão, quando o Payout
    // aponta para uma; senão a da locação (todos os repasses até 24/08/2026).
    const intentId  = payout.sourcePaymentIntentId ?? payout.booking.stripePaymentIntentId

    try {
      if (account.stripeAccountId && account.stripeConnectStatus === "ACTIVE" && intentId) {
        const paymentIntent = await getStripe().paymentIntents.retrieve(intentId)
        const chargeId = idOf(paymentIntent.latest_charge)

        if (!chargeId) throw new Error("PaymentIntent sem latest_charge — não é possível criar o Transfer.")

        const transfer = await createOwnerTransfer({
          payoutId:             payout.id,
          bookingId:            payout.booking.id,
          amount:               payout.amount,
          destinationAccountId: account.stripeAccountId,
          sourceChargeId:       chargeId,
        })

        console.warn(`[cron/payout] COMPLETED (Stripe Connect) id=${payout.id} transfer=${transfer.id} amount=${payout.amount}`)
      } else {
        // Fallback: proprietário sem Connect ativo — execução manual via PIX
        // (comportamento original, V1+ era a integração automática — agora
        // é automática só pra quem já conectou o Stripe).
        // SEC-CRIT-04: NÃO logar a chave PIX em texto claro (PII/financeiro, LGPD).
        const pixTail = String(account.pixKey ?? "").slice(-4)
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
