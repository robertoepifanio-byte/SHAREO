/**
 * pauta-raimundo-2026-08-22, item 3 — decisão de Raimundo (25/08/2026).
 * Arquivo fonte: lib/disputeWindow.ts
 */
import { checkDisputeWindow } from "@/lib/disputeWindow"

describe("checkDisputeWindow — locatário", () => {
  it("pode abrir durante a locação ativa (ACTIVE)", () => {
    const result = checkDisputeWindow(
      { status: "ACTIVE", returnRequestedAt: null },
      { isBorrower: true, isOwner: false },
    )
    expect(result.ok).toBe(true)
  })

  it("NÃO pode abrir depois de já ter devolvido (RETURNED)", () => {
    const result = checkDisputeWindow(
      { status: "RETURNED", returnRequestedAt: new Date() },
      { isBorrower: true, isOwner: false },
    )
    expect(result.ok).toBe(false)
  })
})

describe("checkDisputeWindow — locador", () => {
  it("NÃO pode abrir enquanto a locação ainda está ativa", () => {
    const result = checkDisputeWindow(
      { status: "ACTIVE", returnRequestedAt: null },
      { isBorrower: false, isOwner: true },
    )
    expect(result.ok).toBe(false)
  })

  it("pode abrir dentro de 48h da devolução", () => {
    const result = checkDisputeWindow(
      { status: "RETURNED", returnRequestedAt: new Date(Date.now() - 47 * 60 * 60 * 1000) },
      { isBorrower: false, isOwner: true },
    )
    expect(result.ok).toBe(true)
  })

  it("NÃO pode abrir depois de 48h da devolução", () => {
    const result = checkDisputeWindow(
      { status: "RETURNED", returnRequestedAt: new Date(Date.now() - 49 * 60 * 60 * 1000) },
      { isBorrower: false, isOwner: true },
    )
    expect(result.ok).toBe(false)
  })

  it("exatamente 48h ainda está dentro da janela (limite inclusivo)", () => {
    const result = checkDisputeWindow(
      { status: "RETURNED", returnRequestedAt: new Date(Date.now() - 48 * 60 * 60 * 1000 + 1000) },
      { isBorrower: false, isOwner: true },
    )
    expect(result.ok).toBe(true)
  })

  it("dado legado sem returnRequestedAt não é bloqueado pela janela — fail-open", () => {
    const result = checkDisputeWindow(
      { status: "RETURNED", returnRequestedAt: null },
      { isBorrower: false, isOwner: true },
    )
    expect(result.ok).toBe(true)
  })
})
