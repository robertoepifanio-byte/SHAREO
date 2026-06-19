import type { CancellationConfig } from "@/lib/platform-config"

export type { CancellationConfig }

export interface RefundResult {
  refundAmount:  number
  refundPercent: number
  reason:        string
}

const DEFAULTS: CancellationConfig = {
  fullRefundHours:    24,
  partialRefundHours: 6,
  partialPercent:     70,
  latePercent:        50,
}

/**
 * Calcula o reembolso com base na política de cancelamento.
 * Aceita config opcional (lida do banco via getCancellationConfig()).
 * Quando omitida, usa os valores padrão.
 */
export function calcRefund(
  startDate:   Date,
  canceledAt:  Date,
  totalPrice:  number,
  cfg:         CancellationConfig = DEFAULTS,
): RefundResult {
  const hoursUntilStart = (startDate.getTime() - canceledAt.getTime()) / 3_600_000

  if (hoursUntilStart >= cfg.fullRefundHours) {
    return {
      refundAmount:  totalPrice,
      refundPercent: 100,
      reason:        `Cancelamento até ${cfg.fullRefundHours}h antes do início — reembolso total.`,
    }
  }

  if (hoursUntilStart >= cfg.partialRefundHours) {
    return {
      refundAmount:  Math.round(totalPrice * cfg.partialPercent / 100),
      refundPercent: cfg.partialPercent,
      reason:        `Cancelamento entre ${cfg.fullRefundHours}h e ${cfg.partialRefundHours}h antes do início — reembolso de ${cfg.partialPercent}%.`,
    }
  }

  return {
    refundAmount:  Math.round(totalPrice * cfg.latePercent / 100),
    refundPercent: cfg.latePercent,
    reason:        `Cancelamento com menos de ${cfg.partialRefundHours}h antes do início — reembolso de ${cfg.latePercent}%.`,
  }
}

/** Descrição textual da política para exibição em UI. */
export function getCancellationPolicyLines(cfg: CancellationConfig = DEFAULTS) {
  return [
    { label: `Até ${cfg.fullRefundHours}h antes`,                                          detail: `reembolso total (100%)` },
    { label: `Entre ${cfg.fullRefundHours}h e ${cfg.partialRefundHours}h antes`,            detail: `${cfg.partialPercent}% de reembolso` },
    { label: `Menos de ${cfg.partialRefundHours}h antes`,                                  detail: `${cfg.latePercent}% de reembolso` },
  ]
}

/** @deprecated Use getCancellationPolicyLines() para receber config dinâmica */
export const CANCELLATION_POLICY_LINES = getCancellationPolicyLines()
