/**
 * Repasse ao proprietário via Stripe Connect — as DUAS pontas do mesmo
 * movimento de dinheiro (ADR-028).
 *
 * Antes ficavam em camadas diferentes: o Transfer nascia inline no cron
 * (app/api/cron/payout/route.ts) e a reversão inline no webhook — os dois
 * conversando por um `metadata` Json não tipado, com o nome da chave
 * repetido à mão em cada ponta. Aqui o contrato é declarado uma vez.
 *
 * Mecanismo: "separate charges and transfers" (não destination charge). A
 * cobrança fica na conta da plataforma; o Transfer sai depois, quando o
 * repasse fica elegível (N dias após a devolução) — é isso que preserva a
 * retenção contra disputa que o ShareO já tinha.
 *
 * A taxa da plataforma é IMPLÍCITA: transfere-se só `ownerNetAmount`, nunca
 * o valor cheio. Não se usa `application_fee_amount`.
 */
import type Stripe from "stripe"
import { getStripe } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"

/**
 * Formato do `PlatformTransaction.metadata` das linhas de repasse/reversão.
 *
 * A index signature existe para o tipo ser aceito onde o Prisma espera
 * `InputJsonValue` — sem ela seria preciso um cast em cada gravação, que é
 * justamente o que este tipo veio eliminar.
 */
export type OwnerTransferMetadata = {
  stripeTransferId:  string
  stripeReversalId?: string
  [key: string]: string | undefined
}

function readTransferId(metadata: unknown): string | null {
  return (metadata as OwnerTransferMetadata | null)?.stripeTransferId ?? null
}

/**
 * Cria o Transfer real da parte do proprietário e registra em
 * PlatformTransaction (tipo OWNER_PAYOUT) para auditoria. Devolve o Transfer.
 *
 * `source_transaction` é OBRIGATÓRIO para transferências envolvendo o Brasil
 * (doc da Stripe) — liga a transferência à cobrança original.
 *
 * `idempotencyKey` por `payoutId`: se o cron reprocessar por causa de um
 * timeout de rede DEPOIS do Transfer já ter sido criado na Stripe, a segunda
 * chamada devolve o Transfer original em vez de mandar o dinheiro duas vezes.
 */
export async function createOwnerTransfer({
  payoutId,
  bookingId,
  amount,
  destinationAccountId,
  sourceChargeId,
}: {
  payoutId:             string
  bookingId:            string
  amount:               number
  destinationAccountId: string
  sourceChargeId:       string
}): Promise<Stripe.Transfer> {
  const stripe = getStripe()

  const transfer = await stripe.transfers.create(
    {
      amount,
      currency:           "brl",
      destination:        destinationAccountId,
      source_transaction: sourceChargeId,
      transfer_group:     bookingId, // mesmo grupo setado na Checkout Session
    },
    { idempotencyKey: `payout-transfer-${payoutId}` },
  )

  const metadata: OwnerTransferMetadata = { stripeTransferId: transfer.id }

  await prisma.$transaction([
    prisma.payout.update({
      where: { id: payoutId },
      data:  { status: "COMPLETED", processedAt: new Date() },
    }),
    prisma.platformTransaction.create({
      data: {
        bookingId,
        type:        "OWNER_PAYOUT",
        amount,
        description: `Transfer Stripe Connect para ${destinationAccountId}`,
        metadata,
      },
    }),
  ])

  return transfer
}

/**
 * Devolve à plataforma a parte do repasse correspondente ao valor que saiu de
 * volta pro locatário — quando o repasse JÁ tinha acontecido. Sem isso o
 * proprietário fica com o dinheiro e a plataforma absorve o estorno sozinha.
 *
 * Um único caminho para os dois gatilhos ("o dinheiro voltou pro locatário"):
 * reembolso (`charge.refunded`) e disputa perdida (`charge.dispute.closed`).
 * Por isso a assinatura é em valores — `clawbackAmount`/`chargedAmount` — e
 * não em `Stripe.Charge`: era justamente o acoplamento ao Charge que fazia o
 * caso da disputa parecer inalcançável.
 *
 * Cumulativo e idempotente: soma o que já foi revertido e reverte só a
 * diferença, então reembolso parcial em vários eventos converge sem estourar
 * o "already reversed" da Stripe. A `idempotencyKey` é o alvo acumulado, o
 * que torna a reentrega do mesmo evento inofensiva.
 *
 * No-op silencioso quando não há repasse ainda — é o caso NORMAL: o
 * cancelamento costuma vir antes da devolução, quando o Transfer nem existe.
 */
export async function reverseOwnerTransfer({
  bookingId,
  clawbackAmount,
  chargedAmount,
  reason,
}: {
  bookingId:      string
  clawbackAmount: number
  chargedAmount:  number
  reason:         string
}): Promise<void> {
  if (chargedAmount <= 0) return

  const rows = await prisma.platformTransaction.findMany({
    where:  { bookingId, type: { in: ["OWNER_PAYOUT", "REFUND"] } },
    select: { type: true, amount: true, metadata: true },
  })

  const payout = rows.find((r) => r.type === "OWNER_PAYOUT")
  if (!payout) return

  const transferId = readTransferId(payout.metadata)
  if (!transferId) return

  const alreadyReversed = rows
    .filter((r) => r.type === "REFUND" && readTransferId(r.metadata) === transferId)
    .reduce((sum, r) => sum + r.amount, 0)

  const targetReversed = Math.min(
    payout.amount,
    Math.round((clawbackAmount / chargedAmount) * payout.amount),
  )
  const toReverseNow = targetReversed - alreadyReversed
  if (toReverseNow <= 0) return

  const stripe = getStripe()
  const reversal = await stripe.transfers.createReversal(
    transferId,
    { amount: toReverseNow, description: reason },
    { idempotencyKey: `transfer-reversal-${bookingId}-${targetReversed}` },
  )

  const metadata: OwnerTransferMetadata = {
    stripeTransferId:  transferId,
    stripeReversalId:  reversal.id,
  }

  await prisma.platformTransaction.create({
    data: {
      bookingId,
      type:        "REFUND",
      amount:      toReverseNow,
      description: `Reversão de Transfer Stripe Connect (${transferId}) — ${reason}`,
      metadata,
    },
  })

  console.warn(`[owner-transfer] ${transferId} revertido em ${toReverseNow} (reserva ${bookingId})`)
}
