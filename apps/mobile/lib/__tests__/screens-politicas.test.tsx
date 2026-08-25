// Fonte: app/politicas/page.tsx
//
// Trava de transcrição literal: rótulos verbatim do site (apps/mobile/CLAUDE.md §1).
// Prova que os números dinâmicos (taxa, prazo, limite, cancelamento) vêm de
// usePlatformConfig() — renderizar com config diferente e verificar que o texto muda.
//
// 🪤 <Text> de várias linhas vira UM nó em RNTL. Nunca usar getByText de meia frase
//    com string exata — usar regex para buscar substring dentro do nó concatenado.

import React from "react"
import { render, screen, fireEvent } from "@testing-library/react-native"
import { Linking } from "react-native"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import PoliticasScreen from "@/app/politicas"
import type { PublicConfig } from "@/lib/platformConfig"
import { DEFAULT_CONFIG } from "@/lib/platformConfig"

// ── Mocks globais ─────────────────────────────────────────────────────────────

// 🪤 Os tokens vêm do módulo REAL, não de uma cópia escrita à mão. A primeira
// versão deste mock inventava `warning: "#D97706"` e `success: "#059669"`, cores
// que não existem em lib/theme.tsx (`#F59E0B` e `#007B3C`) — o teste passava
// validando uma paleta que o app nunca renderiza.
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

// 🪤 usePlatformConfig: mockado com jest.fn() para que cada teste possa
//    sobrescrever o retorno e verificar que os números mudam.
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

// ── Utilitários ───────────────────────────────────────────────────────────────

function makeQC() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
}

function wrap(ui: React.ReactElement) {
  return render(
    <SafeAreaProvider>
      <QueryClientProvider client={makeQC()}>
        {ui}
      </QueryClientProvider>
    </SafeAreaProvider>,
  )
}

// ── Testes ────────────────────────────────────────────────────────────────────

describe("PoliticasScreen — rótulos verbatim (transcrição de app/politicas/page.tsx)", () => {

  beforeEach(() => {
    mockUsePlatformConfig.mockReturnValue(DEFAULT_CONFIG)
  })

  it("exibe o título principal e a data de atualização", () => {
    wrap(<PoliticasScreen />)
    expect(screen.getAllByText("Políticas do ShareO").length).toBeGreaterThan(0)
    expect(screen.getByText(/Última atualização: 20 de agosto de 2026/)).toBeTruthy()
  })

  it("exibe o parágrafo de introdução verbatim", () => {
    wrap(<PoliticasScreen />)
    expect(
      screen.getByText(
        /Estas políticas regem o uso da plataforma ShareO e o tratamento de dados pessoais/,
      ),
    ).toBeTruthy()
  })

  it("exibe o cabeçalho do índice e seus 6 itens verbatim", () => {
    wrap(<PoliticasScreen />)
    // 🪤 Os rótulos do índice repetem nos SectionHeaders — cada um aparece ≥2×.
    //    Usando getAllByText para confirmar presença sem falhar com "multiple found".
    expect(screen.getByText("Nesta página")).toBeTruthy()
    expect(screen.getAllByText("1. Termos de Uso").length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText("2. Política de Privacidade (LGPD)").length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText("3. Responsabilidade").length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText("4. Cancelamento e Reembolso").length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText("5. Cookies e Analytics").length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText("6. Contato").length).toBeGreaterThanOrEqual(2)
  })

  it("exibe os títulos dos 8 sub-blocos da seção 1", () => {
    wrap(<PoliticasScreen />)
    expect(screen.getByText("1.1 Descrição do Serviço")).toBeTruthy()
    expect(screen.getByText("1.2 Elegibilidade")).toBeTruthy()
    expect(screen.getByText("1.3 Cadastro e Conta")).toBeTruthy()
    expect(screen.getByText("1.4 Regras para Anúncio de Itens")).toBeTruthy()
    expect(screen.getByText("1.5 Itens Proibidos")).toBeTruthy()
    expect(screen.getByText("1.6 Obrigações do Locatário")).toBeTruthy()
    expect(screen.getByText("1.7 Pagamentos e Taxa de Serviço")).toBeTruthy()
    expect(screen.getByText("1.8 Alterações nos Termos")).toBeTruthy()
  })

  it("exibe os títulos dos 7 sub-blocos da seção 2", () => {
    wrap(<PoliticasScreen />)
    expect(screen.getByText("2.1 Dados Coletados")).toBeTruthy()
    expect(screen.getByText("2.2 Finalidade e Base Legal")).toBeTruthy()
    expect(screen.getByText("2.3 Compartilhamento de Dados")).toBeTruthy()
    expect(screen.getByText("2.4 Retenção de Dados")).toBeTruthy()
    expect(screen.getByText("2.5 Direitos do Titular (LGPD Art. 18)")).toBeTruthy()
    expect(screen.getByText("2.6 Segurança")).toBeTruthy()
    expect(screen.getByText("2.7 Encarregado (DPO)")).toBeTruthy()
  })

  it("exibe os títulos dos 4 sub-blocos da seção 3", () => {
    wrap(<PoliticasScreen />)
    expect(screen.getByText("3.1 Papel do ShareO")).toBeTruthy()
    expect(screen.getByText("3.2 Limitação de Responsabilidade")).toBeTruthy()
    expect(screen.getByText("3.3 Disputas")).toBeTruthy()
    expect(screen.getByText("3.4 Indenização")).toBeTruthy()
  })

  it("exibe os títulos dos 3 sub-blocos da seção 4", () => {
    wrap(<PoliticasScreen />)
    expect(screen.getByText("4.1 Cancelamento pelo Locatário")).toBeTruthy()
    expect(screen.getByText("4.2 Cancelamento pelo Locador")).toBeTruthy()
    expect(screen.getByText("4.3 Processamento do Reembolso")).toBeTruthy()
  })

  it("exibe os títulos dos 2 sub-blocos da seção 5", () => {
    wrap(<PoliticasScreen />)
    expect(screen.getByText("5.1 Cookies Funcionais")).toBeTruthy()
    expect(screen.getByText("5.2 Analytics (Google Analytics 4)")).toBeTruthy()
  })

  it("exibe os 3 e-mails de contato na seção 6 verbatim", () => {
    wrap(<PoliticasScreen />)
    expect(screen.getByText("Dúvidas gerais e suporte:")).toBeTruthy()
    expect(screen.getByText("Privacidade e direitos LGPD:")).toBeTruthy()
    expect(screen.getByText("Segurança e incidentes:")).toBeTruthy()
    // Links de e-mail
    expect(screen.getAllByText("suporte@shareo.com.br").length).toBeGreaterThan(0)
    expect(screen.getAllByText("privacidade@shareo.com.br").length).toBeGreaterThan(0)
    expect(screen.getAllByText("seguranca@shareo.com.br").length).toBeGreaterThan(0)
  })

  it("exibe o nome do DPO verbatim", () => {
    wrap(<PoliticasScreen />)
    expect(screen.getByText("Roberto Epifanio da Silva")).toBeTruthy()
  })

  it("exibe as bases legais da seção 2.2 verbatim", () => {
    wrap(<PoliticasScreen />)
    expect(screen.getByText("Execução do contrato")).toBeTruthy()
    expect(screen.getByText("Obrigação legal")).toBeTruthy()
    expect(screen.getByText("Legítimo interesse")).toBeTruthy()
    expect(screen.getByText("Consentimento")).toBeTruthy()
  })
})

describe("PoliticasScreen — valores dinâmicos vêm de usePlatformConfig()", () => {

  beforeEach(() => {
    mockUsePlatformConfig.mockReturnValue(DEFAULT_CONFIG)
  })

  it("exibe a taxa de serviço do config (default 15%)", () => {
    wrap(<PoliticasScreen />)
    // Seção 1.7: "taxa de serviço de 15%"
    // 🪤 O parágrafo é um único nó concatenado — usar regex para substring
    expect(screen.getByText(/taxa de serviço de 15%/)).toBeTruthy()
  })

  it("exibe o prazo de repasse do config (default 3 dias)", () => {
    wrap(<PoliticasScreen />)
    // Seção 1.7: "3 dias após a confirmação da devolução"
    expect(screen.getByText(/3 dias após a confirmação da devolução/)).toBeTruthy()
  })

  it("exibe o limite por transação do config (default R$ 500)", () => {
    wrap(<PoliticasScreen />)
    // Seção 1.7: "R$ 500 por transação"
    expect(screen.getByText(/R\$ 500 por transação/)).toBeTruthy()
  })

  it("exibe a política de cancelamento plana na seção 4.1", () => {
    wrap(<PoliticasScreen />)
    // Seção 4.1 — parágrafo único, sem faixas de horas.
    expect(screen.getByText(/100% do valor pago/)).toBeTruthy()
    expect(screen.getByText(/taxa que a Stripe já havia cobrado/)).toBeTruthy()
  })

  it("atualiza a taxa de serviço quando a config muda", () => {
    const customConfig: PublicConfig = {
      ...DEFAULT_CONFIG,
      feeRateBps: 2000, // 20%
    }
    mockUsePlatformConfig.mockReturnValue(customConfig)

    wrap(<PoliticasScreen />)

    // Com config customizada: "20%" deve aparecer, "15%" não deve aparecer em 1.7
    expect(screen.getByText(/taxa de serviço de 20%/)).toBeTruthy()
    expect(screen.queryByText(/taxa de serviço de 15%/)).toBeNull()
  })

  it("atualiza o prazo de repasse quando a config muda", () => {
    const customConfig: PublicConfig = {
      ...DEFAULT_CONFIG,
      payoutWindowDays: 5,
    }
    mockUsePlatformConfig.mockReturnValue(customConfig)

    wrap(<PoliticasScreen />)

    expect(screen.getByText(/5 dias após a confirmação da devolução/)).toBeTruthy()
    expect(screen.queryByText(/3 dias após a confirmação da devolução/)).toBeNull()
  })

  it("atualiza o limite por transação quando a config muda", () => {
    const customConfig: PublicConfig = {
      ...DEFAULT_CONFIG,
      checkoutMaxCents: 100_000, // R$ 1.000
    }
    mockUsePlatformConfig.mockReturnValue(customConfig)

    wrap(<PoliticasScreen />)

    expect(screen.getByText(/R\$ 1\.000 por transação/)).toBeTruthy()
    expect(screen.queryByText(/R\$ 500 por transação/)).toBeNull()
  })

  it("seção 4.1 não exibe faixas de horas nem percentuais antigos", () => {
    // A política de cancelamento é agora um parágrafo estático (sem config dinâmica).
    wrap(<PoliticasScreen />)
    expect(screen.queryByText(/horas antes:/)).toBeNull()
    expect(screen.queryByText(/reembolso de 70%/)).toBeNull()
    expect(screen.queryByText(/reembolso de 50%/)).toBeNull()
  })
})

describe("direito de opt-out do Analytics", () => {
  // A primeira transcrição suprimiu o link e acrescentou "em seu navegador",
  // texto que o site não tem. Num documento de privacidade o link não é
  // enfeite: é o MEIO de exercer o direito descrito no parágrafo.
  it("mantém o texto do site, sem acréscimo", () => {
    wrap(<PoliticasScreen />)

    expect(screen.getByText(/instalando o/)).toBeTruthy()
    expect(screen.getByText("complemento de desativação do Google Analytics")).toBeTruthy()
    expect(screen.queryByText(/em seu navegador/)).toBeNull()
  })

  it("o complemento é tocável e abre o opt-out do Google", () => {
    const abrir = jest.spyOn(Linking, "openURL").mockResolvedValue(true)
    wrap(<PoliticasScreen />)

    fireEvent.press(screen.getByText("complemento de desativação do Google Analytics"))

    expect(abrir).toHaveBeenCalledWith("https://tools.google.com/dlpage/gaoptout")
    abrir.mockRestore()
  })
})
