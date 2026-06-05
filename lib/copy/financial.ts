export const FINANCIAL_COPY = {
  platformFee: 'Taxa ShareO',
  ownerNetAmount: 'O que você recebe',
  holdback: 'Prazo de liberação',
  chargeback: 'Contestação de pagamento',
  depositHold: 'Caução reservada',
  payoutFailed: 'Problema no repasse',
  pixAccount: 'Conta de recebimento PIX',
} as const

export type FinancialCopyKey = keyof typeof FINANCIAL_COPY
