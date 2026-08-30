/**
 * Extensão de prazo — preço das diárias extras e aplicação da extensão.
 *
 * ATOR-03: aprovar uma extensão não cobrava nada. O `endDate` era empurrado e
 * `totalDays`/`totalPrice`/split ficavam como estavam, então o proprietário
 * emprestava dias de graça e o repasse saía calculado sobre o valor antigo.
 *
 * **Decisão do fundador (2026-08-24): a extensão só vale depois de paga.**
 * Esta é a explicação canônica — os outros pontos do fluxo apontam para cá em
 * vez de repetir o racional.
 *
 * O módulo existe porque a extensão é aplicada em DOIS lugares que precisam
 * concordar: a aprovação (quando a reserva ainda não foi paga, e o checkout
 * comum já cobra o total atualizado) e o webhook de pagamento (quando já
 * estava paga). Mesmo padrão de `lib/payout.ts` — dois caminhos ao mesmo
 * estado, e o irmão esquecido é sempre o que erra.
 */
import { prisma } from "@/lib/prisma"
import { getPlatformFeeRate, calcSplitComDesconto } from "@/lib/platform-config"

const DIA_MS = 24 * 60 * 60 * 1000

export type ResultadoExtensao =
  | { aplicada: true;  dias: number; valor: number }
  | { aplicada: false; motivo: "SEM_PEDIDO" | "JA_APLICADA" }

/**
 * Dias acrescentados por uma extensão.
 *
 * Arredonda para CIMA: qualquer fração de dia a mais é um dia cobrado, que é
 * como a locação já conta o período (`totalDays`, em app/api/bookings/route.ts).
 * Nunca devolve negativo — a data solicitada é validada como posterior no POST,
 * mas depender disso aqui deixaria o cálculo de DINHEIRO à mercê de uma
 * validação em outro arquivo.
 */
export function diasExtras(endDateAtual: Date, novaEndDate: Date): number {
  const ms = novaEndDate.getTime() - endDateAtual.getTime()
  return Math.max(0, Math.ceil(ms / DIA_MS))
}

/** Valor das diárias extras, em centavos. */
export function valorExtensao(dailyPrice: number, dias: number): number {
  return dailyPrice * dias
}

/**
 * Aplica a extensão: move o `endDate`, soma dias e valor, e recalcula o split
 * com a taxa VIGENTE.
 *
 * 🪤 O split é recalculado sobre o total novo, não somado ao antigo: a taxa vem
 * de `getPlatformFeeRate()` e pode ter mudado entre a reserva e a extensão.
 * Somar deltas fixaria a taxa antiga sem ninguém perceber.
 *
 * @param paymentIntentId PaymentIntent das diárias extras, quando veio de uma
 *   cobrança própria (webhook). É dele que sai o Transfer da extensão — a
 *   cobrança da locação não tem esse dinheiro.
 */
export async function aplicarExtensao(
  bookingId: string,
  paymentIntentId?: string | null,
): Promise<ResultadoExtensao> {
  const [b, feeRate] = await Promise.all([
    prisma.booking.findUniqueOrThrow({
      where:  { id: bookingId },
      select: {
        endDate: true, totalDays: true, totalPrice: true, dailyPrice: true,
        discountCents: true, extensionRequestedEndDate: true,
        extensionAmountCents: true, extensionStatus: true,
      },
    }),
    getPlatformFeeRate(),
  ])

  if (!b.extensionRequestedEndDate) {
    console.warn(`[extensao] id=${bookingId} SEM PEDIDO de extensão — nada aplicado`)
    return { aplicada: false, motivo: "SEM_PEDIDO" }
  }

  // 🪤 Idempotência explícita, e não acidental. Sem este guard, um retry do
  // webhook só não duplicava porque `endDate` já teria se movido e `diasExtras`
  // devolveria 0 — o que deixa de valer se o locatário registrar um pedido novo
  // no meio. `payout.ts` aprendeu a mesma lição com o "já existe".
  if (b.extensionStatus === "APPROVED") {
    console.warn(`[extensao] id=${bookingId} JÁ APLICADA — nada a fazer`)
    return { aplicada: false, motivo: "JA_APLICADA" }
  }

  const dias  = diasExtras(b.endDate, b.extensionRequestedEndDate)
  // Prefere o valor gravado na aprovação: é o que o locatário viu e pagou.
  // Recalcular aqui divergiria se o `dailyPrice` do item tivesse mudado no meio.
  const extra = b.extensionAmountCents ?? valorExtensao(b.dailyPrice, dias)

  const novoTotal = b.totalPrice + extra
  const split     = calcSplitComDesconto(novoTotal, b.discountCents ?? 0, feeRate)

  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      endDate:           b.extensionRequestedEndDate,
      totalDays:         b.totalDays + dias,
      totalPrice:        novoTotal,
      platformFeeRate:   split.platformFeeRate,
      platformFeeAmount: split.platformFeeAmount,
      ownerNetAmount:    split.ownerNetAmount,
      extensionStatus:   "APPROVED",
      // `extensionAmountCents` PERMANECE: é o registro de quanto foi cobrado, e
      // o que permite separar, no repasse, a parte de cada cobrança.
      ...(paymentIntentId && { extensionPaymentIntentId: paymentIntentId }),
    },
  })

  return { aplicada: true, dias, valor: extra }
}
