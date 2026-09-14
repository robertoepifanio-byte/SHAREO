import React from "react"
import { render, screen } from "@testing-library/react"
import { PreLaunchHome } from "@/components/PreLaunchHome"
import { ANCORAS_LEGADO } from "@/lib/landing-content"

/**
 * ListaVIP é Server Component async e não pode ser renderizada como filha em
 * teste. O stub reproduz os dois ids que a página real expõe — `lista-vip`
 * (seção) e `founder-form` (container do formulário) — porque são exatamente
 * o alvo das âncoras verificadas abaixo. A ListaVIP verdadeira tem sua própria
 * suíte, e o formulário também.
 */
jest.mock("@/components/ListaVIP", () => ({
  ListaVIP: () => (
    <section id="lista-vip">
      <div id="founder-form" />
    </section>
  ),
}))

describe("PreLaunchHome", () => {
  /**
   * O teste que mais paga da suíte.
   *
   * Âncora quebrada não lança erro, não aparece no console e não muda nada na
   * tela: o clique simplesmente não vai a lugar nenhum. Numa página que tem
   * seis CTAs e cinco links de navegação, todos apontando para âncoras, esse é
   * o defeito mais provável e o menos visível — e numa campanha paga ele custa
   * o lead inteiro.
   */
  it("toda âncora da página aponta para um id que existe", () => {
    const { container } = render(<PreLaunchHome />)

    const ancoras = Array.from(container.querySelectorAll('a[href^="#"]'))
    expect(ancoras.length).toBeGreaterThan(0)

    const quebradas = ancoras
      .map((a) => a.getAttribute("href") ?? "")
      .filter((href) => href !== "#" && !container.querySelector(`#${CSS.escape(href.slice(1))}`))

    expect(quebradas).toEqual([])
  })

  /**
   * As âncoras dos banners de programa aposentados. Nenhum link da página
   * aponta para elas, então o teste acima não as cobre — mas anúncio publicado
   * pode apontar, e um id removido por "limpeza" não quebraria nada visível.
   */
  it("preserva as âncoras legadas dos banners aposentados", () => {
    const { container } = render(<PreLaunchHome />)

    const ausentes = ANCORAS_LEGADO.filter((id) => !container.querySelector(`#${id}`))
    expect(ausentes).toEqual([])
  })

  it("tem um único h1", () => {
    render(<PreLaunchHome />)
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
  })

  /**
   * Dois formulários duplicariam os ids dos campos, quebrariam a associação
   * <label for> e disparariam o evento de funil duas vezes por carregamento —
   * inflando o denominador da razão visita→envio.
   */
  it("tem um único ponto de captação", () => {
    const { container } = render(<PreLaunchHome />)
    expect(container.querySelectorAll("#founder-form")).toHaveLength(1)
  })

  it("mantém a ordem de seções acordada no redesenho", () => {
    const { container } = render(<PreLaunchHome />)

    const titulos = Array.from(container.querySelectorAll("h2")).map((h) =>
      (h.textContent ?? "").trim(),
    )

    expect(titulos).toEqual([
      expect.stringMatching(/quantas coisas/i),
      expect.stringMatching(/de qual lado/i),
      expect.stringMatching(/como vai funcionar/i),
      expect.stringMatching(/quanto vale/i),
      expect.stringMatching(/desconhecido/i),
      expect.stringMatching(/grupo fundador/i),
      expect.stringMatching(/embaixador/i),
      expect.stringMatching(/perguntas frequentes/i),
      expect.stringMatching(/procurado por alguém/i),
    ])
  })
})
