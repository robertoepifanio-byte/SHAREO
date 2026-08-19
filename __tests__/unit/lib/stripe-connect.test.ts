import { deriveStripeConnectStatus } from "@/lib/stripe-connect"
import type { Stripe } from "stripe"

/** Monta um Account mínimo — só os campos que deriveStripeConnectStatus lê. */
function account(overrides: {
  charges_enabled?: boolean
  payouts_enabled?: boolean
  disabled_reason?: string | null
}): Stripe.Account {
  return {
    charges_enabled: overrides.charges_enabled ?? false,
    payouts_enabled: overrides.payouts_enabled ?? false,
    requirements: overrides.disabled_reason !== undefined
      ? { disabled_reason: overrides.disabled_reason }
      : null,
  } as unknown as Stripe.Account
}

describe("deriveStripeConnectStatus", () => {
  it("retorna ACTIVE quando charges e payouts estão habilitados", () => {
    expect(deriveStripeConnectStatus(account({ charges_enabled: true, payouts_enabled: true }))).toBe("ACTIVE")
  })

  it("retorna ONBOARDING quando nada foi habilitado e não há disabled_reason", () => {
    expect(deriveStripeConnectStatus(account({}))).toBe("ONBOARDING")
  })

  it("retorna ONBOARDING mesmo com requirements presente mas disabled_reason null", () => {
    expect(deriveStripeConnectStatus(account({ disabled_reason: null }))).toBe("ONBOARDING")
  })

  it("retorna RESTRICTED quando há disabled_reason que não começa com 'rejected.'", () => {
    expect(deriveStripeConnectStatus(account({ disabled_reason: "requirements.pending_verification" }))).toBe("RESTRICTED")
  })

  it("retorna REJECTED quando disabled_reason começa com 'rejected.'", () => {
    expect(deriveStripeConnectStatus(account({ disabled_reason: "rejected.fraud" }))).toBe("REJECTED")
  })

  it("prioriza REJECTED mesmo se charges/payouts ainda aparecerem como true (dado inconsistente vindo da Stripe)", () => {
    expect(
      deriveStripeConnectStatus(
        account({ charges_enabled: true, payouts_enabled: true, disabled_reason: "rejected.fraud" }),
      ),
    ).toBe("REJECTED")
  })

  it("não fica ACTIVE só com charges habilitado — payouts também precisa estar", () => {
    expect(deriveStripeConnectStatus(account({ charges_enabled: true, payouts_enabled: false }))).toBe("ONBOARDING")
  })

  it("não fica ACTIVE só com payouts habilitado — charges também precisa estar", () => {
    expect(deriveStripeConnectStatus(account({ charges_enabled: false, payouts_enabled: true }))).toBe("ONBOARDING")
  })
})
