import React from "react"
import { render, screen } from "@testing-library/react"
import { Hero } from "@/components/landing/Hero"
import { CTA_HREF } from "@/lib/landing-content"

/**
 * O hero é a mudança estrutural do redesenho: o título saiu de DENTRO de uma
 * imagem e virou texto. Estes testes existem para impedir a regressão — se
 * alguém trocar o H1 por uma arte de novo, a página perde escala de fonte,
 * seleção, tradução e indexação (WCAG 1.4.5) sem nada quebrar visualmente.
 */
describe("Hero", () => {
  it("tem exatamente um h1", () => {
    render(<Hero />)
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
  })

  it("o h1 é TEXTO, não o alt de uma imagem", () => {
    const { container } = render(<Hero />)
    const h1 = container.querySelector("h1")

    expect(h1?.textContent).toMatch(/faça isso virar dinheiro/i)
    expect(h1?.querySelector("img")).toBeNull()
  })

  it("o CTA aponta para o formulário", () => {
    render(<Hero />)
    const cta = screen.getByRole("link", { name: /quero ser um dos primeiros/i })
    expect(cta).toHaveAttribute("href", CTA_HREF)
  })

  /**
   * A arte do hero tem texto embutido (o fluxo "furadeira parada → ShareO →
   * renda extra" e a pergunta manuscrita), então `alt=""` deixaria quem usa
   * leitor de tela sem acesso ao que ela mostra. Mas o alt também não pode
   * transcrever as frases: elas repetem o H1 e o parágrafo ao lado quase
   * palavra por palavra, e reler isso é ruído, não acessibilidade.
   */
  it("a ilustração descreve o que mostra, sem repetir a headline", () => {
    const { container } = render(<Hero />)
    const imagens = [...container.querySelectorAll("img")]

    expect(imagens.length).toBeGreaterThan(0)

    for (const img of imagens) {
      const alt = img.getAttribute("alt") ?? ""
      expect(alt.length).toBeGreaterThan(20)
      expect(alt).not.toMatch(/virar dinheiro/i)
      expect(alt).not.toMatch(/quase não usa/i)
    }
  })
})
