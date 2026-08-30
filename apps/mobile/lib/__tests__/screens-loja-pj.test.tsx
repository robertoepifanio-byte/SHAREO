// Fonte: apps/mobile/app/loja/[slug].tsx
// Testa a vitrine pública de um anunciante.
// RÓTULOS VERBATIM — divergência daqui sem correspondente na tela quebra o CI.
//
// 🪤 <Text> multilinha vira UM nó — getByText de meia frase nunca casa.
//    Para textos longos usar regex parcial /trecho/.
// 🪤 FlatList com scrollEnabled={false} dentro de ScrollView precisa de
//    `SafeAreaProvider` para resolver useSafeAreaInsets() dos filhos.

import React from "react"
import {
  render,
  screen,
  waitFor,
  act,
} from "@testing-library/react-native"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { SafeAreaProvider } from "react-native-safe-area-context"

import LojaScreen from "@/app/loja/[slug]"

// ── Mocks ──────────────────────────────────────────────────────────────────────

jest.mock("@/lib/api", () => ({
  apiFetch:  jest.fn(),
  API_URL:   "https://staging.shareo.com.br",
  getTokens: jest.fn().mockResolvedValue(null),
}))

jest.mock("@/lib/theme", () => ({
  useTheme: () => ({
    mode:   "light" as const,
    tokens: {
      bg:               "#F8FAFC",
      surface:          "#FFFFFF",
      text:             "#0F172A",
      muted:            "#64748B",
      border:           "#E2E8F0",
      navy:             "#003366",
      green:            "#007B3C",
      error:            "#C0392B",
      success:          "#007B3C",
      accent:           "#59C686",
      warning:          "#F59E0B",
      disabledBg:       "#E2E8F0",
      disabledText:     "#94A3B8",
      disabledBorder:   "#CBD5E1",
      bookingPending:   "#F59E0B",
      bookingActive:    "#007B3C",
      bookingCompleted: "#64748B",
      bookingCancelled: "#E74C3C",
      bookingDisputed:  "#C05800",
    },
  }),
}))

jest.mock("@/lib/auth", () => ({
  useAuth: (selector: (s: unknown) => unknown) =>
    selector({ user: null, logout: jest.fn(), loading: false }),
}))

jest.mock("expo-router", () => ({
  router:               { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({ slug: "loja-teste" })),
  Link:                 ({ children }: { children: React.ReactNode }) => children,
  usePathname:          () => "/",
  useSegments:          () => [],
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeOwner(overrides: Record<string, unknown> = {}) {
  return {
    id:         "owner-1",
    name:       "Ferramentas do Zé",
    slug:       "loja-teste",
    bio:        "Alugamos as melhores ferramentas da cidade.",
    avatarUrl:  null,
    city:       "São Paulo",
    state:      "SP",
    userType:   "PJ",
    isVerified: true,
    createdAt:  "2024-01-15T12:00:00Z",
    _count: { items: 3, reviewsReceived: 7 },
    ...overrides,
  }
}

function makeItem(id: string, title: string) {
  return {
    id,
    title,
    pricePerDay:  3500,
    city:         "São Paulo",
    state:        "SP",
    neighborhood: "Centro",
    images:       [],
    category:     { name: "Ferramentas", slug: "ferramentas" },
    owner:        { name: "Ferramentas do Zé", isVerified: true },
  }
}

function makeResponse(overrides: {
  owner?: Record<string, unknown>
  items?: ReturnType<typeof makeItem>[]
  avgRating?: number | null
  reviewCount?: number
} = {}) {
  return {
    data: {
      owner:       makeOwner(overrides.owner),
      items:       overrides.items ?? [makeItem("i-1", "Furadeira Bosch")],
      avgRating:   overrides.avgRating ?? 4.5,
      reviewCount: overrides.reviewCount ?? 7,
    },
  }
}

// ── Utilitários ────────────────────────────────────────────────────────────────

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

function setApiFetch(response: unknown) {
  const { apiFetch } = jest.requireMock("@/lib/api") as { apiFetch: jest.Mock }
  apiFetch.mockResolvedValueOnce(response)
}

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => jest.clearAllMocks())

afterEach(async () => {
  await act(async () => {})
})

// ── Loading ────────────────────────────────────────────────────────────────────

describe("LojaScreen — loading", () => {
  it("exibe indicador de carregamento enquanto a API responde", () => {
    const { apiFetch } = jest.requireMock("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockReturnValueOnce(new Promise(() => {})) // pendente

    wrap(<LojaScreen />)

    expect(screen.getByLabelText("Carregando vitrine")).toBeTruthy()
  })

  it("exibe botão Voltar enquanto carrega", () => {
    const { apiFetch } = jest.requireMock("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockReturnValueOnce(new Promise(() => {}))

    wrap(<LojaScreen />)

    expect(screen.getByText("← Voltar")).toBeTruthy()
  })
})

// ── Render principal ───────────────────────────────────────────────────────────

describe("LojaScreen — render com dados", () => {
  it("exibe o nome do anunciante verbatim", async () => {
    setApiFetch(makeResponse())
    wrap(<LojaScreen />)
    await waitFor(() => expect(screen.getByText("Ferramentas do Zé")).toBeTruthy())
  })

  it("exibe badge '✓ Verificado' para anunciante verificado", async () => {
    setApiFetch(makeResponse())
    wrap(<LojaScreen />)
    await waitFor(() => expect(screen.getByText("✓ Verificado")).toBeTruthy())
  })

  it("exibe badge 'Loja' para conta PJ", async () => {
    setApiFetch(makeResponse())
    wrap(<LojaScreen />)
    await waitFor(() => expect(screen.getByText("Loja")).toBeTruthy())
  })

  it("não exibe badge 'Loja' para conta PF", async () => {
    setApiFetch(makeResponse({ owner: { userType: "PF" } }))
    wrap(<LojaScreen />)
    await waitFor(() => expect(screen.getByText("Ferramentas do Zé")).toBeTruthy())
    expect(screen.queryByText("Loja")).toBeNull()
  })

  it("exibe localização '📍 São Paulo, SP' verbatim", async () => {
    setApiFetch(makeResponse())
    wrap(<LojaScreen />)
    // 🪤 emoji + texto — usar regex parcial
    await waitFor(() => expect(screen.getByText(/São Paulo, SP/)).toBeTruthy())
  })

  it("exibe 'Membro desde' seguido da data", async () => {
    setApiFetch(makeResponse())
    wrap(<LojaScreen />)
    await waitFor(() => expect(screen.getByText(/Membro desde/)).toBeTruthy())
  })

  it("exibe a bio do anunciante", async () => {
    setApiFetch(makeResponse())
    wrap(<LojaScreen />)
    await waitFor(() =>
      expect(screen.getByText("Alugamos as melhores ferramentas da cidade.")).toBeTruthy(),
    )
  })

  it("exibe o botão 'Ver perfil'", async () => {
    // 🪤 RNTL 12.x: getByAccessibilityLabel não existe — usar getByLabelText
    setApiFetch(makeResponse())
    wrap(<LojaScreen />)
    await waitFor(() =>
      expect(screen.getByLabelText("Ver perfil")).toBeTruthy(),
    )
  })

  it("exibe a contagem de itens (plural)", async () => {
    // Dois itens → plural — sem ambiguidade
    setApiFetch(makeResponse({ items: [makeItem("i-1", "Furadeira"), makeItem("i-2", "Parafusadeira")] }))
    wrap(<LojaScreen />)
    // Template literal garante nó único: "2 itens disponíveis"
    await waitFor(() => expect(screen.getByText("2 itens disponíveis")).toBeTruthy())
  })

  it("exibe a contagem de itens (singular)", async () => {
    setApiFetch(makeResponse({ items: [makeItem("i-1", "Furadeira")] }))
    wrap(<LojaScreen />)
    // Template literal garante nó único: "1 item disponível"
    await waitFor(() => expect(screen.getByText("1 item disponível")).toBeTruthy())
  })

  it("exibe o título do item na lista", async () => {
    setApiFetch(makeResponse())
    wrap(<LojaScreen />)
    await waitFor(() => expect(screen.getByText("Furadeira Bosch")).toBeTruthy())
  })

  it("não exibe badge '✓ Verificado' para anunciante não verificado", async () => {
    setApiFetch(makeResponse({ owner: { isVerified: false } }))
    wrap(<LojaScreen />)
    await waitFor(() => expect(screen.getByText("Ferramentas do Zé")).toBeTruthy())
    expect(screen.queryByText("✓ Verificado")).toBeNull()
  })

  it("não exibe localização quando city e state são nulos", async () => {
    setApiFetch(makeResponse({ owner: { city: null, state: null } }))
    wrap(<LojaScreen />)
    await waitFor(() => expect(screen.getByText("Ferramentas do Zé")).toBeTruthy())
    expect(screen.queryByText(/📍/)).toBeNull()
  })

  it("não exibe bio quando ela é nula", async () => {
    setApiFetch(makeResponse({ owner: { bio: null } }))
    wrap(<LojaScreen />)
    await waitFor(() => expect(screen.getByText("Ferramentas do Zé")).toBeTruthy())
    expect(
      screen.queryByText("Alugamos as melhores ferramentas da cidade."),
    ).toBeNull()
  })
})

// ── Estado vazio ──────────────────────────────────────────────────────────────

describe("LojaScreen — nenhum item", () => {
  it("exibe 'Nenhum item disponível' quando a lista está vazia", async () => {
    setApiFetch(makeResponse({ items: [] }))
    wrap(<LojaScreen />)
    await waitFor(() =>
      expect(screen.getByText("Nenhum item disponível")).toBeTruthy(),
    )
  })

  it("exibe mensagem com nome do anunciante no estado vazio", async () => {
    setApiFetch(makeResponse({ items: [] }))
    wrap(<LojaScreen />)
    await waitFor(() =>
      expect(
        screen.getByText(/Ferramentas do Zé ainda não tem itens ativos/),
      ).toBeTruthy(),
    )
  })
})

// ── Erro / não encontrado ──────────────────────────────────────────────────────

describe("LojaScreen — erro de API", () => {
  it("exibe 'Vitrine não encontrada' em caso de erro", async () => {
    const { apiFetch } = jest.requireMock("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockRejectedValueOnce(
      Object.assign(new Error("Vitrine não encontrada."), { status: 404, code: "NOT_FOUND" }),
    )
    wrap(<LojaScreen />)
    await waitFor(() =>
      expect(screen.getByText("Vitrine não encontrada")).toBeTruthy(),
    )
  })

  it("exibe botão 'Tentar novamente' em caso de erro", async () => {
    const { apiFetch } = jest.requireMock("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockRejectedValueOnce(new Error("Network request failed"))
    wrap(<LojaScreen />)
    await waitFor(() =>
      expect(screen.getByText("Tentar novamente")).toBeTruthy(),
    )
  })
})
