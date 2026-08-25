// Fonte: apps/mobile/app/meus-anuncios/desempenho.tsx
// Testes RNTL da tela "Desempenho dos Anúncios":
//   - Abas visíveis e "Desempenho" como ativa (rótulos verbatim)
//   - Estado de loading: ActivityIndicator visível
//   - PJ com itens: cards de totais + lista "Por anúncio"
//   - PJ sem itens: empty state verbatim
//   - Usuário PF: gate "Analytics exclusivo para contas PJ" verbatim
//   - Não autenticado: tela de sessão expirada
//
// RÓTULOS VERBATIM — qualquer alteração sem correspondente no componente
// indica regressão de transcrição.
//
// 🪤 <Text> multilinha vira UM nó no RNTL; getByText de meia frase NUNCA casa
//    (MEMORY feedback-rntl-text-multilinha-e-cleanup).
//    Usamos a string completa do nó ou getAllByText.

import React from "react"
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react-native"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { SafeAreaProvider } from "react-native-safe-area-context"

import DesempenhoScreen from "@/app/meus-anuncios/desempenho"

// ── Mocks ──────────────────────────────────────────────────────────────────────

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

// ── Fixtures ────────────────────────────────────────────────────────────────────

function makeMeResponse(userType: "PF" | "PJ" = "PJ") {
  return { data: { id: "user-pj-1", userType } }
}

function makeDesempenhoResponse(overrides: {
  items?: Array<{
    id: string
    title: string
    status: string
    viewCount: number
    favoritesCount: number
    bookingsCount: number
    revenue: number
    avgRating: number | null
    ratingsCount: number
    imageUrl: string | null
  }>
  totals?: {
    views: number; bookings: number; revenue: number
    avgRating: number | null; ratingsCount: number
  }
} = {}) {
  return {
    data: {
      totals: overrides.totals ?? {
        views:        150,
        bookings:     2,
        revenue:      8000,
        avgRating:    4.5,
        ratingsCount: 2,
      },
      items: overrides.items ?? [
        {
          id:             "item-001",
          title:          "Furadeira Bosch 500W",
          status:         "AVAILABLE",
          viewCount:      150,
          favoritesCount: 7,
          bookingsCount:  2,
          revenue:        8000,
          avgRating:      4.5,
          ratingsCount:   2,
          imageUrl:       null,
        },
      ],
    },
  }
}

const { apiFetch: mockApiFetch } = jest.requireMock("@/lib/api")
const { router }                 = jest.requireMock("expo-router")

function setApiFetch(responses: Record<string, unknown>) {
  mockApiFetch.mockImplementation((path: string) => {
    if (responses[path] !== undefined) return Promise.resolve(responses[path])
    return Promise.reject(new Error(`apiFetch não mockado para ${path}`))
  })
}

function wrap(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <SafeAreaProvider>{ui}</SafeAreaProvider>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  mockUser = { id: "user-pj-1", name: "Empresa Teste", email: "empresa@test.com" }
})

afterEach(async () => {
  // Limpa timers pendentes do React Query (evita warning de act())
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0))
  })
})

// ── Estrutura de abas (rótulos verbatim) ─────────────────────────────────────

describe("DesempenhoScreen — abas (rótulos verbatim)", () => {
  it('exibe aba "Anúncios" inativa', async () => {
    setApiFetch({
      "/api/users/me": makeMeResponse("PJ"),
      "/api/meus-anuncios/desempenho": makeDesempenhoResponse(),
    })
    wrap(<DesempenhoScreen />)
    await waitFor(() => expect(screen.getByText("Anúncios")).toBeTruthy())
  })

  it('exibe aba "Desempenho" como ativa (accessibilityState selected=true)', async () => {
    setApiFetch({
      "/api/users/me": makeMeResponse("PJ"),
      "/api/meus-anuncios/desempenho": makeDesempenhoResponse(),
    })
    wrap(<DesempenhoScreen />)
    await waitFor(() => expect(screen.getByText("Desempenho")).toBeTruthy())
    // A aba ativa é uma View — getByLabelText retorna o elemento correto
    const tab = screen.getByLabelText("Desempenho")
    expect(tab.props.accessibilityState?.selected).toBe(true)
  })

  it('exibe aba "Integrações" inativa e navega ao pressionar', async () => {
    setApiFetch({
      "/api/users/me": makeMeResponse("PJ"),
      "/api/meus-anuncios/desempenho": makeDesempenhoResponse(),
    })
    wrap(<DesempenhoScreen />)
    await waitFor(() => expect(screen.getByText("Integrações")).toBeTruthy())
    fireEvent.press(screen.getByRole("tab", { name: "Integrações" }))
    expect(router.push).toHaveBeenCalledWith("/meus-anuncios/integracoes")
  })

  it('"Anúncios" chama router.back()', async () => {
    setApiFetch({
      "/api/users/me": makeMeResponse("PJ"),
      "/api/meus-anuncios/desempenho": makeDesempenhoResponse(),
    })
    wrap(<DesempenhoScreen />)
    await waitFor(() => expect(screen.getByRole("tab", { name: "Anúncios" })).toBeTruthy())
    fireEvent.press(screen.getByRole("tab", { name: "Anúncios" }))
    expect(router.back).toHaveBeenCalledTimes(1)
  })

  it('"Importar" aparece somente para PJ', async () => {
    setApiFetch({
      "/api/users/me": makeMeResponse("PJ"),
      "/api/meus-anuncios/desempenho": makeDesempenhoResponse(),
    })
    wrap(<DesempenhoScreen />)
    await waitFor(() => expect(screen.queryByText("Importar")).toBeTruthy())
  })

  it('"Importar" não aparece para PF', async () => {
    setApiFetch({ "/api/users/me": makeMeResponse("PF") })
    wrap(<DesempenhoScreen />)
    await waitFor(() =>
      expect(screen.getByText("Analytics exclusivo para contas PJ")).toBeTruthy()
    )
    expect(screen.queryByText("Importar")).toBeNull()
  })
})

// ── Gate PJ (verbatim de PjGate.tsx feature="analytics") ────────────────────

describe("DesempenhoScreen — gate PJ", () => {
  it('exibe "Analytics exclusivo para contas PJ" para usuário PF (VERBATIM)', async () => {
    setApiFetch({ "/api/users/me": makeMeResponse("PF") })
    wrap(<DesempenhoScreen />)
    await waitFor(() =>
      expect(screen.getByText("Analytics exclusivo para contas PJ")).toBeTruthy()
    )
  })

  it("exibe descrição do gate (VERBATIM)", async () => {
    setApiFetch({ "/api/users/me": makeMeResponse("PF") })
    wrap(<DesempenhoScreen />)
    await waitFor(() =>
      expect(
        screen.getByText(
          "Acompanhe visualizações, reservas e receita de cada anúncio em tempo real. Disponível para Pessoas Jurídicas.",
        ),
      ).toBeTruthy()
    )
  })
})

// ── Empty state (verbatim de page.tsx) ───────────────────────────────────────

describe("DesempenhoScreen — empty state", () => {
  it('exibe "Nenhum anúncio ainda" quando PJ não tem itens (VERBATIM)', async () => {
    setApiFetch({
      "/api/users/me": makeMeResponse("PJ"),
      "/api/meus-anuncios/desempenho": makeDesempenhoResponse({
        items:  [],
        totals: { views: 0, bookings: 0, revenue: 0, avgRating: null, ratingsCount: 0 },
      }),
    })
    wrap(<DesempenhoScreen />)
    await waitFor(() =>
      expect(screen.getByText("Nenhum anúncio ainda")).toBeTruthy()
    )
  })

  it('exibe "Crie seu primeiro anúncio para ver as métricas aqui." (VERBATIM)', async () => {
    setApiFetch({
      "/api/users/me": makeMeResponse("PJ"),
      "/api/meus-anuncios/desempenho": makeDesempenhoResponse({
        items:  [],
        totals: { views: 0, bookings: 0, revenue: 0, avgRating: null, ratingsCount: 0 },
      }),
    })
    wrap(<DesempenhoScreen />)
    await waitFor(() =>
      expect(
        screen.getByText("Crie seu primeiro anúncio para ver as métricas aqui."),
      ).toBeTruthy()
    )
  })

  it('"Criar anúncio →" navega para /itens/novo', async () => {
    setApiFetch({
      "/api/users/me": makeMeResponse("PJ"),
      "/api/meus-anuncios/desempenho": makeDesempenhoResponse({
        items:  [],
        totals: { views: 0, bookings: 0, revenue: 0, avgRating: null, ratingsCount: 0 },
      }),
    })
    wrap(<DesempenhoScreen />)
    await waitFor(() => expect(screen.getByText("Criar anúncio →")).toBeTruthy())
    fireEvent.press(screen.getByText("Criar anúncio →"))
    expect(router.push).toHaveBeenCalledWith("/itens/novo")
  })
})

// ── PJ com itens — cards de totais (verbatim de page.tsx) ────────────────────

describe("DesempenhoScreen — totais e lista por anúncio", () => {
  it('exibe card "Visualizações" (VERBATIM)', async () => {
    setApiFetch({
      "/api/users/me": makeMeResponse("PJ"),
      "/api/meus-anuncios/desempenho": makeDesempenhoResponse(),
    })
    wrap(<DesempenhoScreen />)
    await waitFor(() => expect(screen.getByText("Visualizações")).toBeTruthy())
  })

  it('exibe card "Reservas concluídas" (VERBATIM)', async () => {
    setApiFetch({
      "/api/users/me": makeMeResponse("PJ"),
      "/api/meus-anuncios/desempenho": makeDesempenhoResponse(),
    })
    wrap(<DesempenhoScreen />)
    await waitFor(() => expect(screen.getByText("Reservas concluídas")).toBeTruthy())
  })

  it('exibe card "Receita total" (VERBATIM)', async () => {
    setApiFetch({
      "/api/users/me": makeMeResponse("PJ"),
      "/api/meus-anuncios/desempenho": makeDesempenhoResponse(),
    })
    wrap(<DesempenhoScreen />)
    await waitFor(() => expect(screen.getByText("Receita total")).toBeTruthy())
  })

  it('exibe card "Nota média" (VERBATIM — aparece no StatCard e no grid de métricas)', async () => {
    setApiFetch({
      "/api/users/me": makeMeResponse("PJ"),
      "/api/meus-anuncios/desempenho": makeDesempenhoResponse(),
    })
    wrap(<DesempenhoScreen />)
    // "Nota média" aparece no StatCard E no grid por item — getAllByText garante presença
    await waitFor(() => expect(screen.getAllByText("Nota média").length).toBeGreaterThan(0))
  })

  it('exibe seção "Por anúncio" (VERBATIM)', async () => {
    setApiFetch({
      "/api/users/me": makeMeResponse("PJ"),
      "/api/meus-anuncios/desempenho": makeDesempenhoResponse(),
    })
    wrap(<DesempenhoScreen />)
    await waitFor(() => expect(screen.getByText("Por anúncio")).toBeTruthy())
  })

  it("exibe título do item na lista", async () => {
    setApiFetch({
      "/api/users/me": makeMeResponse("PJ"),
      "/api/meus-anuncios/desempenho": makeDesempenhoResponse(),
    })
    wrap(<DesempenhoScreen />)
    await waitFor(() => expect(screen.getByText("Furadeira Bosch 500W")).toBeTruthy())
  })

  it('exibe "Ativo" para item com status AVAILABLE (VERBATIM)', async () => {
    setApiFetch({
      "/api/users/me": makeMeResponse("PJ"),
      "/api/meus-anuncios/desempenho": makeDesempenhoResponse(),
    })
    wrap(<DesempenhoScreen />)
    await waitFor(() => expect(screen.getByText("Ativo")).toBeTruthy())
  })

  it('exibe "Pausado" para item não disponível (VERBATIM)', async () => {
    setApiFetch({
      "/api/users/me": makeMeResponse("PJ"),
      "/api/meus-anuncios/desempenho": makeDesempenhoResponse({
        items: [{
          id:             "item-001",
          title:          "Andaime Metálico",
          status:         "PAUSED",
          viewCount:      10,
          favoritesCount: 1,
          bookingsCount:  0,
          revenue:        0,
          avgRating:      null,
          ratingsCount:   0,
          imageUrl:       null,
        }],
        totals: { views: 10, bookings: 0, revenue: 0, avgRating: null, ratingsCount: 0 },
      }),
    })
    wrap(<DesempenhoScreen />)
    await waitFor(() => expect(screen.getByText("Pausado")).toBeTruthy())
  })

  it('exibe rótulos de métricas por item: "Views", "Favoritos", "Reservas", "Receita" (VERBATIM)', async () => {
    setApiFetch({
      "/api/users/me": makeMeResponse("PJ"),
      "/api/meus-anuncios/desempenho": makeDesempenhoResponse(),
    })
    wrap(<DesempenhoScreen />)
    await waitFor(() => {
      expect(screen.getByText("Views")).toBeTruthy()
      expect(screen.getByText("Favoritos")).toBeTruthy()
      expect(screen.getByText("Reservas")).toBeTruthy()
      expect(screen.getByText("Receita")).toBeTruthy()
    })
  })

  it('exibe "Meus Anúncios" como título da página (VERBATIM)', async () => {
    setApiFetch({
      "/api/users/me": makeMeResponse("PJ"),
      "/api/meus-anuncios/desempenho": makeDesempenhoResponse(),
    })
    wrap(<DesempenhoScreen />)
    await waitFor(() => expect(screen.getByText("Meus Anúncios")).toBeTruthy())
  })

  it('"Novo anúncio" navega para /itens/novo', async () => {
    setApiFetch({
      "/api/users/me": makeMeResponse("PJ"),
      "/api/meus-anuncios/desempenho": makeDesempenhoResponse(),
    })
    wrap(<DesempenhoScreen />)
    await waitFor(() => expect(screen.getByLabelText("Novo anúncio")).toBeTruthy())
    fireEvent.press(screen.getByLabelText("Novo anúncio"))
    expect(router.push).toHaveBeenCalledWith("/itens/novo")
  })
})

// ── Não autenticado ──────────────────────────────────────────────────────────

describe("DesempenhoScreen — não autenticado", () => {
  it("exibe botão Entrar quando sem sessão", () => {
    mockUser = null
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <SafeAreaProvider>
          <DesempenhoScreen />
        </SafeAreaProvider>
      </QueryClientProvider>,
    )
    expect(screen.getByRole("button", { name: "Entrar" })).toBeTruthy()
  })

  it("botão Entrar navega para /(auth)/login", () => {
    mockUser = null
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <SafeAreaProvider>
          <DesempenhoScreen />
        </SafeAreaProvider>
      </QueryClientProvider>,
    )
    fireEvent.press(screen.getByRole("button", { name: "Entrar" }))
    expect(router.push).toHaveBeenCalledWith("/(auth)/login")
  })
})
