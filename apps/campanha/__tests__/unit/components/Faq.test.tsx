import React from "react"
import { render, screen } from "@testing-library/react"
import { Faq } from "@/components/landing/Faq"
import { FAQ } from "@/lib/landing-content"

describe("Faq", () => {
  it("renderiza uma entrada por pergunta", () => {
    const { container } = render(<Faq />)
    expect(container.querySelectorAll("details")).toHaveLength(FAQ.length)
  })

  it("todas nascem fechadas", () => {
    const { container } = render(<Faq />)
    for (const detalhe of container.querySelectorAll("details")) {
      expect(detalhe.hasAttribute("open")).toBe(false)
    }
  })

  /**
   * A pergunta que mais importa da página. Quem chega pela mídia paga precisa
   * entender rápido que o serviço ainda não abriu — esconder isso converte
   * mais no curto prazo e gera frustração e reclamação depois.
   */
  it("deixa explícito que o serviço ainda não está no ar", () => {
    render(<Faq />)
    expect(screen.getByText(/ainda não/i)).toBeInTheDocument()
  })
})
