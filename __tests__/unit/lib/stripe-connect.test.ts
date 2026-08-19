import { deriveStripeConnectStatus, type StripeConnectAccount } from "@/lib/stripe-connect"

/** Monta um Account v2 mínimo — só os campos que deriveStripeConnectStatus lê. */
function account(overrides: {
  payouts?: "active" | "pending" | "restricted" | "unsupported"
  transfers?: "active" | "pending" | "restricted" | "unsupported"
}): StripeConnectAccount {
  const { payouts, transfers } = overrides
  return {
    configuration: {
      recipient: {
        applied: true,
        capabilities: {
          stripe_balance: {
            payouts:          payouts ? { status: payouts, status_details: [] } : undefined,
            stripe_transfers: transfers ? { status: transfers, status_details: [] } : undefined,
          },
        },
      },
    },
  } as unknown as StripeConnectAccount
}

describe("deriveStripeConnectStatus (Accounts v2)", () => {
  it("retorna ACTIVE quando payouts e stripe_transfers estão active", () => {
    expect(deriveStripeConnectStatus(account({ payouts: "active", transfers: "active" }))).toBe("ACTIVE")
  })

  it("retorna ONBOARDING quando nenhum capability foi retornado ainda", () => {
    expect(deriveStripeConnectStatus(account({}))).toBe("ONBOARDING")
  })

  it("retorna ONBOARDING quando os dois estão pending", () => {
    expect(deriveStripeConnectStatus(account({ payouts: "pending", transfers: "pending" }))).toBe("ONBOARDING")
  })

  it("retorna ONBOARDING quando um está active e o outro pending (ainda não pronto)", () => {
    expect(deriveStripeConnectStatus(account({ payouts: "active", transfers: "pending" }))).toBe("ONBOARDING")
  })

  it("retorna RESTRICTED quando payouts está restricted", () => {
    expect(deriveStripeConnectStatus(account({ payouts: "restricted", transfers: "active" }))).toBe("RESTRICTED")
  })

  it("retorna RESTRICTED quando stripe_transfers está restricted", () => {
    expect(deriveStripeConnectStatus(account({ payouts: "active", transfers: "restricted" }))).toBe("RESTRICTED")
  })

  it("retorna REJECTED quando payouts está unsupported", () => {
    expect(deriveStripeConnectStatus(account({ payouts: "unsupported", transfers: "active" }))).toBe("REJECTED")
  })

  it("retorna REJECTED quando stripe_transfers está unsupported", () => {
    expect(deriveStripeConnectStatus(account({ payouts: "active", transfers: "unsupported" }))).toBe("REJECTED")
  })

  it("prioriza REJECTED sobre RESTRICTED quando um capability é unsupported e o outro restricted", () => {
    expect(deriveStripeConnectStatus(account({ payouts: "unsupported", transfers: "restricted" }))).toBe("REJECTED")
  })
})
