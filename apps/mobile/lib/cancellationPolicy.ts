// Fonte: lib/cancellationPolicy.ts (web)
// Transcrição literal da função getCancellationPolicyLines() para o app mobile.

export interface CancellationPolicyLine {
  label:  string
  detail: string
}

export function getCancellationPolicyLines(): CancellationPolicyLine[] {
  return [
    { label: "Cancelamento pelo locador",   detail: "reembolso integral (100%) ao locatário" },
    { label: "Cancelamento pelo locatário", detail: "reembolso integral (100%), descontada a taxa da Stripe sobre a cobrança original" },
  ]
}
