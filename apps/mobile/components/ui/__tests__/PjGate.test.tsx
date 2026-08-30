// Testes de PjGate — rótulos verbatim de integracoes.tsx (bloco extraído).
// Rótulos fixados: qualquer alteração sem correspondente no componente indica regressão.

import React from "react"
import { render, screen } from "@testing-library/react-native"
import { PjGate } from "@/components/ui/PjGate"

jest.mock("@/lib/theme", () => {
  const TOKENS = {
    surface:  "#FFFFFF",
    border:   "#E2E8F0",
    navy:     "#003366",
    muted:    "#64748B",
    green:    "#007B3C",
  }
  return {
    useTheme: () => ({ preference: "light", mode: "light", tokens: TOKENS, setPreference: jest.fn() }),
  }
})

describe("PjGate", () => {
  it("renderiza título verbatim (default)", () => {
    render(<PjGate />)
    expect(screen.getByText("Recurso exclusivo para contas PJ")).toBeTruthy()
  })

  it("renderiza descrição verbatim (default)", () => {
    render(<PjGate />)
    expect(
      screen.getByText(
        "Este recurso está disponível apenas para contas de Pessoa Jurídica verificadas.",
      ),
    ).toBeTruthy()
  })

  it("aceita título customizado via prop", () => {
    render(<PjGate title="Funcionalidade apenas PJ" />)
    expect(screen.getByText("Funcionalidade apenas PJ")).toBeTruthy()
  })

  it("aceita descrição customizada via prop", () => {
    render(<PjGate description="Somente empresas verificadas têm acesso." />)
    expect(screen.getByText("Somente empresas verificadas têm acesso.")).toBeTruthy()
  })
})
