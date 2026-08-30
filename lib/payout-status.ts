import type { PayoutStatus } from "@prisma/client"

/**
 * Rótulos e cores de status de `Payout` — fonte única para o painel admin
 * (`/admin/financeiro/repasses`) e as exportações CSV que citam status de
 * repasse, evitando divergência entre tela e planilha.
 */
export const PAYOUT_STATUS_LABEL: Record<PayoutStatus, string> = {
  PENDING:    "Pendente",
  PROCESSING: "Processando",
  COMPLETED:  "Concluído",
  FAILED:     "Falhou",
  BLOCKED:    "Bloqueado",
}

export const PAYOUT_STATUS_VARIANT: Record<PayoutStatus, "warning" | "info" | "success" | "danger"> = {
  PENDING:    "warning",
  PROCESSING: "info",
  COMPLETED:  "success",
  FAILED:     "danger",
  BLOCKED:    "danger",
}
