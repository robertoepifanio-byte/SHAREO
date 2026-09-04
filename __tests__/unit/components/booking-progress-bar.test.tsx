/**
 * Barra de progresso da reserva — a etapa ativa é a que ainda VAI acontecer.
 *
 * 🪤 O defeito que isto tranca: o ramo `CONFIRMED` estava deslocado em uma casa
 * nos dois sentidos. Reserva paga exibia "Etapa 3 de 6 — Pagamento" logo acima
 * de um "Pago com sucesso", e reserva por pagar exibia "Confirmação", que já
 * tinha acontecido. Encontrado testando o staging com personas em 03/09/2026 —
 * nenhum teste pegava, porque nenhum olhava a barra.
 *
 * É a mesma confusão que o botão "Ver pagamento" causava depois de pago: a tela
 * insistindo numa etapa que o próprio sistema já sabe concluída.
 */
import { render, screen } from "@testing-library/react"
import { BookingProgressBar } from "@/components/booking/BookingProgressBar"

const etapa = () => screen.getByLabelText("Progresso da reserva").textContent ?? ""

describe("BookingProgressBar", () => {
  it("confirmada e NÃO paga → o que falta é pagar", () => {
    render(<BookingProgressBar status="CONFIRMED" paymentStatus="PENDING" />)
    expect(etapa()).toContain("Etapa 3 de 6")
    expect(etapa()).toContain("Pagamento")
  })

  it("🪤 confirmada e PAGA não fica na etapa de pagamento", () => {
    render(<BookingProgressBar status="CONFIRMED" paymentStatus="PAID" />)
    expect(etapa()).not.toContain("Etapa 3 de 6")
  })

  it("confirmada e paga → o que falta é retirar", () => {
    render(<BookingProgressBar status="CONFIRMED" paymentStatus="PAID" />)
    expect(etapa()).toContain("Etapa 4 de 6")
    // "Em uso" seria o rótulo da etapa 4, e ainda não é verdade: o item não
    // saiu da mão do proprietário. Nomear o que falta evita trocar um rótulo
    // errado por outro.
    expect(etapa()).toContain("Aguardando retirada")
    expect(etapa()).not.toContain("Em uso —")
  })

  it("em uso → etapa 4, com o rótulo próprio", () => {
    render(<BookingProgressBar status="ACTIVE" paymentStatus="PAID" />)
    expect(etapa()).toContain("Etapa 4 de 6")
    expect(etapa()).toContain("Em uso")
  })

  it("devolução em andamento → etapa 5", () => {
    render(<BookingProgressBar status="RETURNED" paymentStatus="PAID" />)
    expect(etapa()).toContain("Etapa 5 de 6")
  })

  it("concluída → etapa 6", () => {
    render(<BookingProgressBar status="COMPLETED" paymentStatus="PAID" />)
    expect(etapa()).toContain("Etapa 6 de 6")
  })

  it("cancelada não mostra barra", () => {
    const { container } = render(<BookingProgressBar status="CANCELLED" paymentStatus="PAID" />)
    expect(container).toBeEmptyDOMElement()
  })
})
