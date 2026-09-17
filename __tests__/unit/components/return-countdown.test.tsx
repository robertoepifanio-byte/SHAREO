/**
 * Countdown de devolução — coerência com a taxa de atraso.
 *
 * 🪤 O defeito que isto tranca: com o atraso já cobrado, a tela exibia
 * "Devolva o item agora para evitar taxas de atraso adicionais" logo acima da
 * caixa "Taxa de atraso aplicada — R$ 15,00". Pedia para evitar o que já tinha
 * sido cobrado. E, no lado do LOCADOR, mandava devolver um item que ele nunca
 * teve em mãos. Visto em staging em 17/09/2026.
 *
 * O caso "taxa já cobrada" é decidido no pai (a tela não renderiza o countdown)
 * e está coberto pela suíte RNTL do detalhe da reserva, que monta a tela toda.
 */
import { render, screen } from "@testing-library/react"
import { ReturnCountdown } from "@/components/booking/ReturnCountdown"

const ONTEM = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
const URGENCIA = "Devolva o item agora para evitar taxas de atraso adicionais."

describe("ReturnCountdown — prazo encerrado", () => {
  it("locatário sem taxa aplicada: pede a devolução", () => {
    render(<ReturnCountdown endDateIso={ONTEM} />)
    expect(screen.getByText("Prazo de devolução encerrado")).toBeInTheDocument()
    expect(screen.getByText(URGENCIA)).toBeInTheDocument()
  })

  it("locador: não manda devolver o item que não está com ele", () => {
    render(<ReturnCountdown endDateIso={ONTEM} isOwner />)
    expect(screen.queryByText(URGENCIA)).toBeNull()
    expect(
      screen.getByText("O locatário está em atraso. A taxa de atraso é aplicada automaticamente.")
    ).toBeInTheDocument()
  })
})
