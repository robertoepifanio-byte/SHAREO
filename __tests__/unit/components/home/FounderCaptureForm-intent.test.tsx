import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { FounderCaptureForm } from "@/components/home/FounderCaptureForm"

/**
 * O par "Quero anunciar" / "Quero alugar" nascia com "anunciar" PRÉ-MARCADO, e
 * `resolveIntent` devolvia "proprietario" para um conjunto vazio. Somados, os
 * dois davam o mesmo resultado: quem nunca tocou nos botões era gravado como
 * anunciante — exatamente o campo que alimenta o ranking de cidade-piloto e a
 * segmentação da campanha paga.
 *
 * Estes testes fixam o contrato novo: nasce sem nada marcado, e o envio fica
 * fechado até o interessado escolher.
 */
describe("FounderCaptureForm — intenção", () => {
  // getByRole com `name` em vez de getAllByRole + posição: locator posicional
  // passa apontando para o elemento errado quando a ordem do DOM muda.
  const anunciar = () => screen.getByRole("checkbox", { name: /quero anunciar/i })
  const alugar   = () => screen.getByRole("checkbox", { name: /quero alugar/i })

  it("não nasce com nenhuma opção pré-selecionada", () => {
    render(<FounderCaptureForm startExpanded />)
    expect(anunciar()).toHaveAttribute("aria-checked", "false")
    expect(alugar()).toHaveAttribute("aria-checked", "false")
  })

  it("marca e DESMARCA — inclusive a última (antes a saída era travada)", async () => {
    const user = userEvent.setup()
    render(<FounderCaptureForm startExpanded />)

    await user.click(anunciar())
    expect(anunciar()).toHaveAttribute("aria-checked", "true")

    await user.click(anunciar())
    expect(anunciar()).toHaveAttribute("aria-checked", "false")
  })

  it("permite as duas ao mesmo tempo (intent 'ambos')", async () => {
    const user = userEvent.setup()
    render(<FounderCaptureForm startExpanded />)

    await user.click(anunciar())
    await user.click(alugar())
    expect(anunciar()).toHaveAttribute("aria-checked", "true")
    expect(alugar()).toHaveAttribute("aria-checked", "true")
  })

  it("bloqueia o envio enquanto nenhuma intenção estiver marcada, mesmo com o resto preenchido", async () => {
    const user = userEvent.setup()
    render(<FounderCaptureForm startExpanded defaultCity="Natal" defaultUf="RN" />)

    await user.type(screen.getByPlaceholderText(/melhor e-mail/i), "teste@shareo.test")
    await user.click(screen.getByRole("checkbox", { name: /concordo/i }))

    const enviar = screen.getByRole("button", { name: /garantir minha vaga/i })
    expect(enviar).toBeDisabled()

    await user.click(anunciar())
    expect(enviar).toBeEnabled()
  })
})
