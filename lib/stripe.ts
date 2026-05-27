import Stripe from "stripe"

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
  })

  return _stripe
}

/** @deprecated Use getStripe() para inicialização lazy */
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as unknown as Record<string | symbol, unknown>)[prop]
  },
})
