// Fonte: components/home/SimuladorRenda.tsx (site) e apps/mobile/components/home/SimuladorRenda.tsx
// RÓTULOS VERBATIM — alteração no componente sem atualizar aqui quebra o CI.

import React from "react"
import { render, screen } from "@testing-library/react-native"
import { SimuladorRenda } from "@/components/home/SimuladorRenda"

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
}))

jest.mock("@/lib/theme", () => ({
  useTheme: () => ({
    mode: "light",
    tokens: {
      surface: "#FFFFFF", border: "#E2E8F0", text: "#0F172A",
      muted: "#64748B", success: "#007B3C", bg: "#F8FAFC",
    },
  }),
}))

// ProcuradoIcon — componente de ícone SVG, não relevante para testes de rótulo
jest.mock("@/components/home/ProcuradoIcon", () => {
  const React = require("react")
  const { View } = require("react-native")
  return { ProcuradoIcon: () => React.createElement(View) }
})

describe("SimuladorRenda mobile — paridade de rótulos com o site", () => {
  it('exibe cabeçalho "Renda Mensal Estimada" (VERBATIM) na tabela', () => {
    render(<SimuladorRenda />)
    expect(screen.getByText("Renda Mensal Estimada")).toBeTruthy()
  })

  it('exibe CTA "Cadastrar meu item agora" (VERBATIM)', () => {
    render(<SimuladorRenda />)
    expect(screen.getByText("Cadastrar meu item agora")).toBeTruthy()
  })

  it('exibe título da seção "Quanto seus itens podem render?"', () => {
    render(<SimuladorRenda />)
    expect(screen.getByText("Quanto seus itens podem render?")).toBeTruthy()
  })

  it('exibe subtítulo de instruções "Estimativa por item"', () => {
    render(<SimuladorRenda />)
    expect(screen.getByText("Estimativa por item")).toBeTruthy()
  })
})
