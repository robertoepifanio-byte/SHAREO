// NÃO importar `next/server` aqui: este módulo é o cliente Stripe puro e é
// alcançado transitivamente por testes que rodam em jsdom (ex.:
// __tests__/unit/lib/stripe-connect.test.ts). `next/server` exige o global
// `Request`, que o jsdom não tem — importá-lo aqui quebra a suíte inteira que
// só queria o cliente. O envelope de webhook (que devolve NextResponse) mora
// em lib/payments/stripe-webhook.ts, junto das outras peças de webhook.
import Stripe from "stripe"

/** Campos expansíveis da Stripe chegam como id OU objeto, conforme o expand. */
export function idOf(ref: string | { id: string } | null | undefined): string | null {
  return typeof ref === "string" ? ref : (ref?.id ?? null)
}

/**
 * Inicialização lazy do cliente Stripe.
 * Lança erro apenas em runtime (não em build-time),
 * evitando falhas de build quando STRIPE_SECRET_KEY não está configurada.
 */
let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (_stripe) return _stripe

  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error("Missing env: STRIPE_SECRET_KEY")
  }

  _stripe = new Stripe(key, {
    apiVersion: "2026-04-22.dahlia",
    typescript:  true,
    // O default do SDK é 80s de timeout e 2 retries — ou seja, UMA chamada
    // travada pode consumir ~240s. O cron de repasse
    // (app/api/cron/payout/route.ts) tem orçamento de 60s e processa um lote
    // de 10, então o default deixaria uma única chamada lenta estourar a
    // execução inteira e deixar os outros repasses sem vez.
    timeout:           15_000,
    maxNetworkRetries: 1,
  })

  return _stripe
}
