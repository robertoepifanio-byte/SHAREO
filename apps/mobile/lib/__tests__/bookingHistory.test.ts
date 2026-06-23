import { deriveBookingHistory } from "../bookingHistory"

// Helper: monta um booking com todos os campos nulos por padrão, sobrescrevendo o necessário.
function makeBooking(overrides: Partial<Parameters<typeof deriveBookingHistory>[0]> = {}) {
  return {
    createdAt:            new Date("2026-06-01T10:00:00Z"),
    respondedAt:          null,
    paidAt:               null,
    activatedAt:          null,
    returnRequestedAt:    null,
    returnedAt:           null,
    cancelledAt:          null,
    cancelReason:         null,
    extensionRequestedAt: null,
    extensionRespondedAt: null,
    extensionStatus:      null,
    status:               "PENDING",
    borrower:             { name: "Ana" },
    owner:                { name: "Bruno" },
    ...overrides,
  }
}

describe("deriveBookingHistory (mobile)", () => {
  it("retorna apenas o evento 'created' quando não há mais nada", () => {
    const events = deriveBookingHistory(makeBooking())
    expect(events).toHaveLength(1)
    expect(events[0].key).toBe("created")
    expect(events[0].actor).toBe("Ana")
    expect(events[0].actorRole).toBe("borrower")
  })

  it("monta o ciclo de vida completo em ordem cronológica", () => {
    const events = deriveBookingHistory(
      makeBooking({
        respondedAt:       new Date("2026-06-01T11:00:00Z"),
        paidAt:            new Date("2026-06-01T12:00:00Z"),
        activatedAt:       new Date("2026-06-02T09:00:00Z"),
        returnRequestedAt: new Date("2026-06-05T09:00:00Z"),
        returnedAt:        new Date("2026-06-05T18:00:00Z"),
        status:            "COMPLETED",
      }),
    )
    expect(events.map((e) => e.key)).toEqual([
      "created",
      "responded",
      "paid",
      "activated",
      "return_requested",
      "returned",
    ])
    // devolução com solicitação prévia → label de confirmação pelo locador
    expect(events[5].label).toBe("Devolução confirmada pelo Locador")
  })

  it("não duplica 'responded' quando o owner cancela na própria resposta", () => {
    const at = new Date("2026-06-01T11:00:00Z")
    const events = deriveBookingHistory(
      makeBooking({
        respondedAt:  at,
        cancelledAt:  at,
        cancelReason: "Item indisponível",
        status:       "CANCELLED",
      }),
    )
    const keys = events.map((e) => e.key)
    expect(keys).not.toContain("responded")
    expect(keys).toContain("cancelled")
    expect(events.find((e) => e.key === "cancelled")?.label).toContain("Item indisponível")
  })

  it("usa label 'Devolução registrada' quando não houve solicitação de devolução", () => {
    const events = deriveBookingHistory(
      makeBooking({ returnedAt: new Date("2026-06-05T18:00:00Z") }),
    )
    expect(events.find((e) => e.key === "returned")?.label).toBe("Devolução registrada")
  })

  it("rotula a extensão conforme aprovada ou recusada", () => {
    const approved = deriveBookingHistory(
      makeBooking({
        extensionRequestedAt: new Date("2026-06-03T09:00:00Z"),
        extensionRespondedAt: new Date("2026-06-03T10:00:00Z"),
        extensionStatus:      "APPROVED",
      }),
    )
    expect(approved.find((e) => e.key === "extension_responded")?.label).toBe(
      "Extensão de prazo aprovada",
    )

    const refused = deriveBookingHistory(
      makeBooking({
        extensionRequestedAt: new Date("2026-06-03T09:00:00Z"),
        extensionRespondedAt: new Date("2026-06-03T10:00:00Z"),
        extensionStatus:      "REJECTED",
      }),
    )
    expect(refused.find((e) => e.key === "extension_responded")?.label).toBe(
      "Extensão de prazo recusada",
    )
  })

  it("ordena os eventos por data ascendente independente da ordem de inserção", () => {
    // paidAt acontece ANTES de respondedAt → o sort deve reordenar.
    const events = deriveBookingHistory(
      makeBooking({
        respondedAt: new Date("2026-06-01T15:00:00Z"),
        paidAt:      new Date("2026-06-01T12:00:00Z"),
      }),
    )
    expect(events.map((e) => e.key)).toEqual(["created", "paid", "responded"])
    for (let i = 1; i < events.length; i++) {
      expect(events[i].at.getTime()).toBeGreaterThanOrEqual(events[i - 1].at.getTime())
    }
  })
})
