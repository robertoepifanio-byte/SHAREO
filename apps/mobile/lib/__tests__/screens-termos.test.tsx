// Fonte: packages/legal/src/TermosConteudo.tsx
//
// Trava de transcrição literal das seções 6 e 7 dos Termos (redação jurídica de
// 21/09/2026). Rótulos verbatim do site; taxa, janela e teto vêm de
// usePlatformConfig() — renderizar com outra config e verificar que o texto muda.
//
// 🪤 <Text> de várias linhas vira UM nó em RNTL: buscar substring com regex.

import React from "react"
import { render, screen } from "@testing-library/react-native"
import { SafeAreaProvider } from "react-native-safe-area-context"

import TermosScreen from "@/app/termos"
import type { PublicConfig } from "@/lib/platformConfig"
import { DEFAULT_CONFIG } from "@/lib/platformConfig"

jest.mock("@/lib/theme", () => {
  const React = require("react")
  const real = jest.requireActual("@/lib/theme")
  return {
    ...real,
    useTheme: () => ({ mode: "light", tokens: real.LIGHT_TOKENS }),
    ThemeProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  }
})

jest.mock("expo-router", () => ({
  router: { back: jest.fn(), push: jest.fn() },
}))

const mockUsePlatformConfig = jest.fn<PublicConfig, []>(() => DEFAULT_CONFIG)

jest.mock("@/lib/platformConfig", () => {
  const actual = jest.requireActual("@/lib/platformConfig")
  return {
    ...actual,
    usePlatformConfig: (...args: []) => mockUsePlatformConfig(...args),
  }
})

jest.mock("@/components/legal/IdentificacaoPrestador", () => ({
  IdentificacaoPrestador: () => null,
}))

function renderTermos() {
  return render(
    <SafeAreaProvider>
      <TermosScreen />
    </SafeAreaProvider>,
  )
}

describe("TermosScreen — seções 6 e 7", () => {
  beforeEach(() => mockUsePlatformConfig.mockReturnValue(DEFAULT_CONFIG))

  it("mostra os títulos das seções 6 e 7 e a nova numeração das demais", () => {
    renderTermos()

    expect(screen.getByText("6. Da Intermediação e do Pagamento das Locações")).toBeTruthy()
    expect(screen.getByText("7. Prevenção à Lavagem de Dinheiro, Fraudes e Outras Atividades Ilícitas")).toBeTruthy()
    expect(screen.getByText("8. Condutas Proibidas")).toBeTruthy()
    expect(screen.getByText("9. Limitação de Responsabilidade")).toBeTruthy()
    expect(screen.getByText("10. Alterações nos Termos")).toBeTruthy()
    expect(screen.getByText("11. Contato")).toBeTruthy()
  })

  it("traz a frase que sustenta o enquadramento: a ShareO não adquire a propriedade dos valores do locador", () => {
    renderTermos()

    expect(screen.getByText("6.2. Pagamento da locação")).toBeTruthy()
    expect(screen.getByText(/A ShareO não adquire a propriedade dos valores destinados ao locador/)).toBeTruthy()
    expect(screen.getByText("6.7. Ausência de serviços financeiros")).toBeTruthy()
  })

  it("lista as oito subcláusulas de PLD/FT", () => {
    renderTermos()

    for (const n of [1, 2, 3, 4, 5, 6, 7, 8]) {
      expect(screen.getByText(new RegExp(`^7\\.${n}\\. `))).toBeTruthy()
    }
  })

  it("taxa e repasse vêm da config, não do texto — muda a config, muda a cláusula", () => {
    mockUsePlatformConfig.mockReturnValue({ ...DEFAULT_CONFIG, feeRateBps: 1000 })
    renderTermos()

    expect(screen.getByText(/corresponde a 10% do valor da locação/)).toBeTruthy()
    expect(screen.getByText(/corresponderá, em regra, a 90% do valor da locação/)).toBeTruthy()
    expect(screen.queryByText(/corresponde a 15% do valor da locação/)).toBeNull()
  })

  it("taxa com casa decimal usa vírgula nas duas cláusulas (12,5% e 87,5%, nunca 12.5%)", () => {
    mockUsePlatformConfig.mockReturnValue({ ...DEFAULT_CONFIG, feeRateBps: 1250 })
    renderTermos()

    expect(screen.getByText(/corresponde a 12,5% do valor da locação/)).toBeTruthy()
    expect(screen.getByText(/corresponderá, em regra, a 87,5% do valor da locação/)).toBeTruthy()
    expect(screen.queryByText(/12\.5%/)).toBeNull()
  })
})
