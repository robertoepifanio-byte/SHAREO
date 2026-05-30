/**
 * Política de cancelamento ShareO
 *
 * Regras:
 *   - Cancelamento até 24h antes do início: 100% de reembolso
 *   - Cancelamento entre 24h e 6h antes do início: 70% de reembolso
 *   - Cancelamento com menos de 6h antes do início: 50% de reembolso
 *
 * Todos os valores monetários são inteiros em centavos (ex: R$ 10,00 = 1000).
 */

export interface RefundResult {
  /** Valor a ser reembolsado, em centavos */
  refundAmount: number
  /** Percentual aplicado (100 | 70 | 50) */
  refundPercent: 100 | 70 | 50
  /** Descrição legível da regra aplicada */
  reason: string
}

/**
 * Calcula o valor de reembolso com base no momento do cancelamento.
 *
 * @param startDate  Data/hora de início da locação
 * @param canceledAt Data/hora em que o cancelamento foi solicitado
 * @param totalPrice Valor total da locação em centavos
 */
export function calcRefund(
  startDate: Date,
  canceledAt: Date,
  totalPrice: number,
): RefundResult {
  const hoursUntilStart =
    (startDate.getTime() - canceledAt.getTime()) / (1000 * 60 * 60)

  if (hoursUntilStart >= 24) {
    return {
      refundAmount:  totalPrice,
      refundPercent: 100,
      reason:        "Cancelamento até 24h antes do início — reembolso total.",
    }
  }

  if (hoursUntilStart >= 6) {
    const refundAmount = Math.round(totalPrice * 0.7)
    return {
      refundAmount,
      refundPercent: 70,
      reason:        "Cancelamento entre 24h e 6h antes do início — reembolso de 70%.",
    }
  }

  const refundAmount = Math.round(totalPrice * 0.5)
  return {
    refundAmount,
    refundPercent: 50,
    reason:        "Cancelamento com menos de 6h antes do início — reembolso de 50%.",
  }
}

/**
 * Descrição textual da política para exibição em UI.
 */
export const CANCELLATION_POLICY_LINES = [
  { label: "Até 24h antes",          detail: "reembolso total (100%)" },
  { label: "Entre 24h e 6h antes",   detail: "70% de reembolso" },
  { label: "Menos de 6h antes",      detail: "50% de reembolso" },
] as const
