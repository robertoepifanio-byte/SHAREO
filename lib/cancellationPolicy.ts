import { formatPrice } from "@/utils/format"

export interface RefundResult {
  refundAmount:  number
  refundPercent: number
  reason:        string
}

export type CanceledBy = "owner" | "borrower"

/**
 * Calcula o reembolso ao locatário quando uma reserva PAGA é cancelada.
 *
 * pauta-raimundo-2026-08-22, item 2 — decisão de Raimundo (25/08/2026):
 * substitui por completo a política anterior por antecedência (100%/70%/50%
 * conforme horas até a retirada). A antecedência deixou de importar — o que
 * importa é QUEM cancela:
 *
 * - Locador cancela: locatário recebe 100% do que pagou. A ShareO abre mão
 *   da própria comissão (15%) e o locador cobre o restante — mas como o
 *   repasse ao locador só acontece em confirm_return (nunca antes de um
 *   cancelamento ser possível, ver TRANSITIONS em bookings/[id]/route.ts),
 *   isso não exige nenhum movimento de dinheiro adicional: o valor cheio
 *   simplesmente nunca chega a ser dividido, e o reembolso da cobrança
 *   original já devolve os 100% sozinho.
 * - Locatário cancela: mesma lógica, mas ele absorve a taxa real que a
 *   Stripe cobrou na cobrança original (`stripeFeeCents` — vem do
 *   `balance_transaction.fee`, não é estimado). `stripeFeeCents` é 0 quando
 *   a taxa não pôde ser apurada (erro na Stripe) — no pior caso o locatário
 *   recebe cheio, nunca a mais nem menos do que pagou.
 */
export function calcRefund(
  totalPrice:      number,
  canceledBy:      CanceledBy,
  stripeFeeCents = 0,
): RefundResult {
  if (canceledBy === "owner" || stripeFeeCents <= 0) {
    return {
      refundAmount:  totalPrice,
      refundPercent: 100,
      reason: canceledBy === "owner"
        ? "Cancelamento pelo locador — reembolso integral ao locatário; a ShareO abre mão da comissão e o locador não recebe repasse."
        : "Cancelamento pelo locatário — reembolso integral (taxa da Stripe não apurada).",
    }
  }

  const refundAmount = Math.max(0, totalPrice - stripeFeeCents)
  return {
    refundAmount,
    refundPercent: totalPrice > 0 ? Math.round((refundAmount / totalPrice) * 100) : 100,
    reason: `Cancelamento pelo locatário — reembolso integral menos a taxa da Stripe na cobrança original (${formatPrice(stripeFeeCents)}).`,
  }
}

/** Descrição textual da política para exibição em UI (Políticas, Ajuda, detalhe do item). */
export function getCancellationPolicyLines() {
  return [
    { label: "Cancelamento pelo locador",   detail: "reembolso integral (100%) ao locatário" },
    { label: "Cancelamento pelo locatário", detail: "reembolso integral (100%), descontada a taxa da Stripe sobre a cobrança original" },
  ]
}
