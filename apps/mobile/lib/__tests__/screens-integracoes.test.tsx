// Fonte: apps/mobile/app/meus-anuncios/integracoes.tsx
// Testes RNTL da tela "Integrações (Webhooks PJ)":
//   - Abas visíveis e "Integrações" como ativa
//   - Estado vazio: rótulos verbatim do site
//   - Lista com webhooks: URL, event badge, botões Pausar/Remover
//   - Erro de rede: "Erro de conexão." visível
//   - Usuário PF: gate "Recurso exclusivo para contas PJ"
//
// RÓTULOS VERBATIM — qualquer alteração sem correspondente no componente
// indica regressão de transcrição.
//
// 🪤 <Text> multilinha vira UM nó no RNTL; getByText de meia frase NUNCA casa
//    (MEMORY feedback-rntl-text-multilinha-e-cleanup).
//    Usamos findAllByText / findByText com a string completa do nó.

import React from "react"
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react-native"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { SafeAreaProvider } from "react-native-safe-area-context"

import IntegracoesScreen from "@/app/meus-anuncios/integracoes"

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock("@/lib/api", () => ({
  apiFetch:  jest.fn(),
  API_URL:   "https://staging.shareo.com.br",
  getTokens: jest.fn().mockResolvedValue(null),
}))

let mockUser: { id: string; name: string; email: string } | null = {
  id:    "user-pj-1",
  name:  "Empresa Teste",
  email: "empresa@test.com",
}

jest.mock("@/lib/auth", () => ({
  useAuth: (selector: (s: unknown) => unknown) =>
    selector({ user: mockUser, logout: jest.fn() }),
}))

jest.mock("@/lib/theme", () => {
  const React = require("react")
  const TOKENS = {
    bg:          "#F8FAFC",
    surface:     "#FFFFFF",
    text:        "#0F172A",
    muted:       "#64748B",
    border:      "#E2E8F0",
    navy:        "#003366",
    green:       "#007B3C",
    error:       "#C0392B",
    success:     "#007B3C",
    accent:      "#59C686",
    disabledBg:  "#E2E8F0",
    disabledText:   "#94A3B8",
    disabledBorder: "#CBD5E1",
  }
  return {
    useTheme: () => ({ preference: "light", mode: "light", tokens: TOKENS, setPreference: jest.fn() }),
    ThemeProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  }
})

// expo-router mockado globalmente no jest.setup.js
// react-native-safe-area-context mockado pelo preset jest-expo

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeWebhook(overrides: Partial<{
  id: string
  url: string
  events: string[]
  isActive: boolean
  failureCount: number
  lastFiredAt: string | null
  lastStatusCode: number | null
}> = {}): {
  id: string; url: string; events: string[]; isActive: boolean;
  failureCount: number; lastFiredAt: string | null; lastStatusCode: number | null; createdAt: string
} {
  return {
    id:             "wh-1",
    url:            "https://erp.empresa.com.br/shareo/events",
    events:         ["booking.created", "booking.paid"],
    isActive:       true,
    failureCount:   0,
    lastFiredAt:    null,
    lastStatusCode: null,
    createdAt:      "2026-08-01T10:00:00.000Z",
    ...overrides,
  }
}

function makeMeResponse(userType: "PF" | "PJ" = "PJ") {
  return { data: { id: "user-pj-1", userType } }
}

function setApiFetch(
  userType: "PF" | "PJ" = "PJ",
  webhooks: ReturnType<typeof makeWebhook>[] = [],
  webhookError = false,
) {
  const { apiFetch } = jest.requireMock("@/lib/api") as { apiFetch: jest.Mock }
  apiFetch.mockImplementation(async (url: string) => {
    if (url === "/api/users/me") return makeMeResponse(userType)
    if (url === "/api/pj/webhooks") {
      if (webhookError) throw new Error("Erro de conexão.")
      return { data: webhooks }
    }
    return {}
  })
}

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

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockUser = { id: "user-pj-1", name: "Empresa Teste", email: "empresa@test.com" }
  const { apiFetch } = jest.requireMock("@/lib/api") as { apiFetch: jest.Mock }
  apiFetch.mockReset()
})

afterEach(async () => {
  // Limpa timers pendentes do React Query (evita vazamento de timer no RNTL)
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0))
  })
})

// ── Testes ────────────────────────────────────────────────────────────────────

describe("IntegracoesScreen — abas", () => {
  it('renderiza as abas verbatim: Anúncios, Desempenho, Integrações (ativa)', async () => {
    setApiFetch("PJ", [])
    wrap(<IntegracoesScreen />)

    // "Integrações" é a aba ativa
    await waitFor(() => expect(screen.getByText("Integrações")).toBeTruthy())

    expect(screen.getByText("Anúncios")).toBeTruthy()
    expect(screen.getByText("Desempenho")).toBeTruthy()
  })

  it('exibe a aba "Importar" somente para PJ', async () => {
    setApiFetch("PJ", [])
    wrap(<IntegracoesScreen />)

    // Aguarda a query me-profile resolver (isPJ depende dela); usa rótulo
    // exclusivo de PJ que só aparece quando meData carregou.
    await waitFor(() =>
      expect(screen.getByText("Nenhum webhook configurado")).toBeTruthy(),
      { timeout: 4000 },
    )
    expect(screen.getByText("Importar")).toBeTruthy()
  })

  it('omite a aba "Importar" para PF (mostra gate em vez de painel)', async () => {
    setApiFetch("PF", [])
    wrap(<IntegracoesScreen />)

    await waitFor(() =>
      expect(screen.getByText("Recurso exclusivo para contas PJ")).toBeTruthy(),
    )
    expect(screen.queryByText("Importar")).toBeNull()
  })
})

describe("IntegracoesScreen — estado vazio", () => {
  it('exibe "Nenhum webhook configurado" e a descrição verbatim', async () => {
    setApiFetch("PJ", [])
    wrap(<IntegracoesScreen />)

    // Aguarda carregamento
    await waitFor(() =>
      expect(screen.getByText("Nenhum webhook configurado")).toBeTruthy(),
    )
    expect(screen.getByText("Crie um endpoint para integrar com seu ERP.")).toBeTruthy()
  })

  it('exibe o botão "Novo endpoint" quando lista está vazia', async () => {
    setApiFetch("PJ", [])
    wrap(<IntegracoesScreen />)

    await waitFor(() =>
      expect(screen.getByText("Nenhum webhook configurado")).toBeTruthy(),
    )
    expect(screen.getByText("Novo endpoint")).toBeTruthy()
  })
})

describe("IntegracoesScreen — lista com webhooks", () => {
  it("exibe a URL do webhook no card", async () => {
    const wh = makeWebhook({ url: "https://erp.empresa.com.br/shareo/events" })
    setApiFetch("PJ", [wh])
    wrap(<IntegracoesScreen />)

    await waitFor(() =>
      expect(screen.getByText("https://erp.empresa.com.br/shareo/events")).toBeTruthy(),
    )
  })

  it("exibe as event badges verbatim", async () => {
    const wh = makeWebhook({ events: ["booking.created", "booking.paid"] })
    setApiFetch("PJ", [wh])
    wrap(<IntegracoesScreen />)

    await waitFor(() => expect(screen.getByText("booking.created")).toBeTruthy())
    expect(screen.getByText("booking.paid")).toBeTruthy()
  })

  it('exibe botão "Pausar" para webhook ativo', async () => {
    const wh = makeWebhook({ isActive: true })
    setApiFetch("PJ", [wh])
    wrap(<IntegracoesScreen />)

    await waitFor(() => expect(screen.getByText("Pausar")).toBeTruthy())
  })

  it('exibe botão "Ativar" para webhook inativo', async () => {
    const wh = makeWebhook({ isActive: false })
    setApiFetch("PJ", [wh])
    wrap(<IntegracoesScreen />)

    await waitFor(() => expect(screen.getByText("Ativar")).toBeTruthy())
  })

  it('exibe botão "Remover"', async () => {
    const wh = makeWebhook()
    setApiFetch("PJ", [wh])
    wrap(<IntegracoesScreen />)

    await waitFor(() => expect(screen.getAllByText("Remover").length).toBeGreaterThan(0))
  })

  it("exibe contador de falhas quando > 0", async () => {
    const wh = makeWebhook({ failureCount: 3 })
    setApiFetch("PJ", [wh])
    wrap(<IntegracoesScreen />)

    await waitFor(() =>
      expect(screen.getByText("3 falhas consecutivas")).toBeTruthy(),
    )
  })

  it('exibe "Webhooks de saída" e a descrição do painel', async () => {
    setApiFetch("PJ", [makeWebhook()])
    wrap(<IntegracoesScreen />)

    await waitFor(() => expect(screen.getByText("Webhooks de saída")).toBeTruthy())
    expect(
      screen.getByText("Receba notificações HTTP quando eventos de reserva acontecerem."),
    ).toBeTruthy()
  })
})

describe("IntegracoesScreen — erro de rede", () => {
  it('exibe "Erro de conexão." quando a API falha', async () => {
    setApiFetch("PJ", [], true /* webhookError */)
    wrap(<IntegracoesScreen />)

    await waitFor(() =>
      expect(screen.getByText("Erro de conexão.")).toBeTruthy(),
      { timeout: 4000 },
    )
  })
})

describe("IntegracoesScreen — PjGate (usuário PF)", () => {
  it('exibe o gate verbatim quando userType é PF', async () => {
    setApiFetch("PF", [])
    wrap(<IntegracoesScreen />)

    await waitFor(() =>
      expect(screen.getByText("Recurso exclusivo para contas PJ")).toBeTruthy(),
    )
    expect(
      screen.getByText(
        "Este recurso está disponível apenas para contas de Pessoa Jurídica verificadas.",
      ),
    ).toBeTruthy()
  })

  it("não exibe painel de webhooks para PF", async () => {
    setApiFetch("PF", [])
    wrap(<IntegracoesScreen />)

    await waitFor(() =>
      expect(screen.getByText("Recurso exclusivo para contas PJ")).toBeTruthy(),
    )
    expect(screen.queryByText("Webhooks de saída")).toBeNull()
    expect(screen.queryByText("Nenhum webhook configurado")).toBeNull()
  })
})

describe("IntegracoesScreen — formulário de criação", () => {
  it('exibe o formulário ao pressionar "Novo endpoint"', async () => {
    setApiFetch("PJ", [])
    wrap(<IntegracoesScreen />)

    await waitFor(() => expect(screen.getByText("Novo endpoint")).toBeTruthy())
    fireEvent.press(screen.getByText("Novo endpoint"))

    await waitFor(() => expect(screen.getByText("Novo endpoint", { exact: false })).toBeTruthy())
    // Título do formulário
    expect(screen.getAllByText("Novo endpoint").length).toBeGreaterThan(0)
    // Rótulos verbatim
    expect(screen.getByText("URL do endpoint (HTTPS obrigatório)")).toBeTruthy()
    expect(screen.getByText("Eventos")).toBeTruthy()
  })

  it('exibe botões "Criar webhook" e "Cancelar" no formulário', async () => {
    setApiFetch("PJ", [])
    wrap(<IntegracoesScreen />)

    await waitFor(() => expect(screen.getByText("Novo endpoint")).toBeTruthy())
    fireEvent.press(screen.getByText("Novo endpoint"))

    await waitFor(() => expect(screen.getByText("Criar webhook")).toBeTruthy())
    expect(screen.getByText("Cancelar")).toBeTruthy()
  })

  it('exibe os rótulos de eventos verbatim do site', async () => {
    setApiFetch("PJ", [])
    wrap(<IntegracoesScreen />)

    await waitFor(() => expect(screen.getByText("Novo endpoint")).toBeTruthy())
    fireEvent.press(screen.getByText("Novo endpoint"))

    await waitFor(() => expect(screen.getByText("Reserva solicitada")).toBeTruthy())
    expect(screen.getByText("Reserva confirmada pelo locador")).toBeTruthy()
    expect(screen.getByText("Reserva cancelada")).toBeTruthy()
    expect(screen.getByText("Pagamento recebido")).toBeTruthy()
    expect(screen.getByText("Item entregue (aluguel ativo)")).toBeTruthy()
    expect(screen.getByText("Item devolvido")).toBeTruthy()
    expect(screen.getByText("Aluguel concluído")).toBeTruthy()
  })
})
