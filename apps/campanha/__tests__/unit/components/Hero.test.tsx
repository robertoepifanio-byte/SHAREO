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

  it("a ilustração é decorativa — o texto ao lado já diz tudo que ela diria", () => {
    const { container } = render(<Hero />)
    for (const img of container.querySelectorAll("img")) {
      expect(img.getAttribute("alt")).toBe("")
    }
  })
})
