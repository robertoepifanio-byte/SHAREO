/**
 * Reserva CONFIRMED antes e depois do pagamento (teste D0 em produção, 26/09/2026):
 * - o selo dizia "Confirmada" ao lado de "Aguardando retirada" na barra;
 * - o dono via "Marcar como ativo" antes do pagamento e a API respondia 402.
 */
import { render, screen } from "@testing-library/react"
import { BookingStatusBadge, bookingStatusLabel } from "@/components/ui/BookingStatusBadge"

jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh: jest.fn(), push: jest.fn() }) }))

import { BookingActions } from "@/app/reservas/[id]/_BookingActions"

describe("selo da reserva CONFIRMED", () => {
  it("sem pagamento: Aguardando pagamento", () => {
    expect(bookingStatusLabel("CONFIRMED", "PENDING")).toBe("Aguardando pagamento")
  })
  it("paga: Aguardando retirada (igual à barra de progresso)", () => {
    render(<BookingStatusBadge status="CONFIRMED" paymentStatus="PAID" />)
    expect(screen.getByText("Aguardando retirada")).toBeInTheDocument()
  })
  it("sem paymentStatus informado: rótulo antigo", () => {
    expect(bookingStatusLabel("CONFIRMED")).toBe("Confirmada")
  })
})

describe("botão Marcar como ativo", () => {
  const base = {
    bookingId: "b1", status: "CONFIRMED" as const, isOwner: true, isBorrower: false,
    extensionStatus: null, extensionRequestedEndDate: null,
  }
  it("não aparece antes do pagamento", () => {
    render(<BookingActions {...base} paymentStatus="PENDING" />)
    expect(screen.queryByText("Marcar como ativo")).not.toBeInTheDocument()
  })
  it("aparece com pagamento confirmado", () => {
    render(<BookingActions {...base} paymentStatus="PAID" />)
    expect(screen.getByText("Marcar como ativo")).toBeInTheDocument()
  })
})
