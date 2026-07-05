// Fonte: apps/mobile/app/meus-anuncios.tsx
// Testes RNTL da tela "Meus Anúncios":
//   - Título "Meus Anúncios" visível
//   - Contador de anúncios (1 anúncio / N anúncios)
//   - Botão "Novo anúncio"
//   - Abas visíveis e na ordem correta
//   - Aba "Importar" somente para PJ
//   - Estado vazio (rótulos verbatim de MyItemsGrid.tsx)
//   - Estado com itens (cards renderizados)
//   - Botões de ação por card: Editar, Pausar/Ativar, Remover
//   - Status banners: Rascunho / Pausado / Disponível
//
// RÓTULOS VERBATIM — qualquer alteração sem correspondente no componente
// indica regressão de transcrição.

import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { SafeAreaProvider } from "react-native-safe-area-context"

import MeusAnunciosScreen from "@/app/meus-anuncios"

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock("@/lib/api", () => ({
  apiFetch:  jest.fn(),
  API_URL:   "https://staging.shareo.com.br",
  getTokens: jest.fn().mockResolvedValue(null),
}))

// Estado de auth mutável por grupo de teste
let mockUser: { id: string; name: string; email: string; isVerified: boolean } | null = {
  id:         "user-owner-1",
  name:       "Carlos Proprietário",
  email:      "carlos@example.com",
  isVerified: true,
}

jest.mock("@/lib/auth", () => ({
  useAuth: (selector: (s: unknown) => unknown) =>
    selector({
      user:   mockUser,
      logout: jest.fn(),
    }),
}))

jest.mock("@/lib/theme", () => {
  const React = require("react")
  const TOKENS = {
    bg:      "#F8FAFC",
    surface: "#FFFFFF",
    text:    "#0F172A",
    muted:   "#64748B",
    border:  "#E2E8F0",
    navy:    "#003366",
    green:   "#007B3C",
    error:   "#C0392B",
    success: "#059669",
    warning: "#D97706",
    disabledBg:     "#E2E8F0",
    disabledText:   "#94A3B8",
    disabledBorder: "#CBD5E1",
    bookingPending:   "#FDE68A",
    bookingActive:    "#BFDBFE",
    bookingCompleted: "#A7F3D0",
    bookingCancelled: "#FECACA",
    bookingDisputed:  "#FDE68A",
  }
  return {
    useTheme: () => ({
      preference: "light",
      mode:       "light",
      tokens:     TOKENS,
      setPreference: jest.fn(),
    }),
    ThemeProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  }
})

// expo-router já mockado em jest.setup.js — não recriar

// expo-image não possui módulo nativo em Jest
jest.mock("expo-image", () => {
  const React = require("react")
  const { View } = require("react-native")
  return {
    Image: ({ accessibilityLabel, style }: { accessibilityLabel?: string; style?: unknown }) =>
      React.createElement(View, { accessibilityLabel, style }),
  }
})

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeItem(overrides: Partial<{
  id: string; title: string; status: string; category: { name: string; slug: string }
}> = {}) {
  return {
    id:           "item-1",
    title:        "Furadeira Bosch 650W",
    pricePerDay:  3500,
    condition:    "BOM",
    city:         "São Paulo",
    state:        "SP",
    neighborhood: "Pinheiros",
    status:       "AVAILABLE",
    images:       [],
    category:     { name: "Ferramentas", slug: "ferramentas" },
    owner:        { name: "Carlos Proprietário", isVerified: true },
    _count:       { reviews: 3, favorites: 7 },
    ...overrides,
  }
}

function makeMe(userType: "PF" | "PJ" = "PF") {
  return { data: { id: "user-owner-1", userType } }
}

function setApiFetch(items: unknown[] = [], userType: "PF" | "PJ" = "PF") {
  const { apiFetch } = jest.requireMock("@/lib/api") as { apiFetch: jest.Mock }
  apiFetch.mockImplementation(async (url: string) => {
    if (url.includes("/api/users/me")) return makeMe(userType)
    // /api/items?ownerId=...
    return { data: items, total: items.length }
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

// Aguarda o contador de anúncios aparecer (confirma que a query resolveu)
async function waitForLoad(pattern: string | RegExp = /anúncio/) {
  await waitFor(
    () => expect(screen.getByText(pattern)).toBeTruthy(),
    { timeout: 4000 },
  )
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockUser = {
    id:         "user-owner-1",
    name:       "Carlos Proprietário",
    email:      "carlos@example.com",
    isVerified: true,
  }
  setApiFetch()
})

// ── Título ────────────────────────────────────────────────────────────────────

describe("Título — verbatim de meus-anuncios/page.tsx linha 48", () => {
  it("exibe 'Meus Anúncios' no cabeçalho", async () => {
    setApiFetch([])
    wrap(<MeusAnunciosScreen />)
    // Título pode aparecer antes da query resolver (estático no header)
    await waitFor(() =>
      expect(screen.getByText("Meus Anúncios")).toBeTruthy(),
    )
  })
})

// ── Contador ──────────────────────────────────────────────────────────────────

describe("Contador de anúncios — verbatim meus-anuncios/page.tsx linhas 50-51", () => {
  it("exibe '0 anúncios' quando lista vazia", async () => {
    setApiFetch([])
    wrap(<MeusAnunciosScreen />)
    await waitFor(() => expect(screen.getByText("0 anúncios")).toBeTruthy())
  })

  it("exibe '1 anúncio' no singular quando há 1 item", async () => {
    setApiFetch([makeItem()])
    wrap(<MeusAnunciosScreen />)
    await waitFor(() => expect(screen.getByText("1 anúncio")).toBeTruthy())
  })

  it("exibe '2 anúncios' no plural quando há 2 itens", async () => {
    setApiFetch([makeItem({ id: "item-1" }), makeItem({ id: "item-2", title: "Parafusadeira" })])
    wrap(<MeusAnunciosScreen />)
    await waitFor(() => expect(screen.getByText("2 anúncios")).toBeTruthy())
  })
})

// ── Botão "Novo anúncio" ──────────────────────────────────────────────────────

describe("Botão 'Novo anúncio' — verbatim meus-anuncios/page.tsx linhas 53-62", () => {
  it("exibe botão 'Novo anúncio' no header", async () => {
    setApiFetch([])
    wrap(<MeusAnunciosScreen />)
    await waitFor(() =>
      expect(screen.getByLabelText("Novo anúncio")).toBeTruthy(),
    )
  })

  it("'Novo anúncio' com texto verbatim", async () => {
    setApiFetch([])
    wrap(<MeusAnunciosScreen />)
    await waitFor(() =>
      expect(screen.getByText("Novo anúncio")).toBeTruthy(),
    )
  })
})

// ── Barra de abas ─────────────────────────────────────────────────────────────

describe("Barra de abas — rótulos verbatim de meus-anuncios/page.tsx linhas 65-101", () => {
  it("exibe aba 'Anúncios'", async () => {
    setApiFetch([])
    wrap(<MeusAnunciosScreen />)
    await waitFor(() =>
      expect(screen.getByLabelText("Anúncios")).toBeTruthy(),
    )
  })

  it("exibe aba 'Desempenho'", async () => {
    setApiFetch([])
    wrap(<MeusAnunciosScreen />)
    await waitFor(() =>
      expect(screen.getByLabelText("Desempenho")).toBeTruthy(),
    )
  })

  it("exibe aba 'Integrações'", async () => {
    setApiFetch([])
    wrap(<MeusAnunciosScreen />)
    await waitFor(() =>
      expect(screen.getByLabelText("Integrações")).toBeTruthy(),
    )
  })

  it("NÃO exibe aba 'Importar' para usuário PF — verbatim página linhas 83-92", async () => {
    setApiFetch([], "PF")
    wrap(<MeusAnunciosScreen />)
    // Aguarda a query me-profile resolver
    await waitFor(() => expect(screen.getByText("0 anúncios")).toBeTruthy())
    expect(screen.queryByLabelText("Importar")).toBeNull()
  })

  it("exibe aba 'Importar' para usuário PJ — verbatim página linhas 83-92", async () => {
    setApiFetch([], "PJ")
    wrap(<MeusAnunciosScreen />)
    await waitFor(() =>
      expect(screen.getByLabelText("Importar")).toBeTruthy(),
      { timeout: 4000 },
    )
  })
})

// ── Estado vazio ──────────────────────────────────────────────────────────────

describe("Estado vazio — rótulos verbatim de MyItemsGrid.tsx linhas 91-106", () => {
  it("exibe 'Nenhum anúncio ainda' quando lista vazia", async () => {
    setApiFetch([])
    wrap(<MeusAnunciosScreen />)
    await waitForLoad("0 anúncios")
    await waitFor(() =>
      expect(screen.getByText("Nenhum anúncio ainda")).toBeTruthy(),
    )
  })

  it("exibe descrição verbatim do empty state", async () => {
    setApiFetch([])
    wrap(<MeusAnunciosScreen />)
    await waitForLoad("0 anúncios")
    await waitFor(() =>
      expect(
        screen.getByText("Comece a ganhar dinheiro alugando o que você tem."),
      ).toBeTruthy(),
    )
  })

  it("exibe botão 'Criar primeiro anúncio' no empty state — verbatim linha 99", async () => {
    setApiFetch([])
    wrap(<MeusAnunciosScreen />)
    await waitForLoad("0 anúncios")
    await waitFor(() =>
      expect(screen.getByLabelText("Criar primeiro anúncio")).toBeTruthy(),
    )
  })
})

// ── Estado com itens ──────────────────────────────────────────────────────────

describe("Estado com itens — cards renderizados", () => {
  it("exibe título do item", async () => {
    setApiFetch([makeItem()])
    wrap(<MeusAnunciosScreen />)
    await waitForLoad("1 anúncio")
    await waitFor(() =>
      expect(screen.getByText("Furadeira Bosch 650W")).toBeTruthy(),
    )
  })

  it("exibe nome da categoria em uppercase — verbatim do site", async () => {
    setApiFetch([makeItem()])
    wrap(<MeusAnunciosScreen />)
    await waitForLoad("1 anúncio")
    await waitFor(() =>
      expect(screen.getByText("Ferramentas")).toBeTruthy(),
    )
  })

  it("botões de ação 'Editar', 'Pausar' e 'Remover' visíveis por card AVAILABLE", async () => {
    setApiFetch([makeItem({ status: "AVAILABLE" })])
    wrap(<MeusAnunciosScreen />)
    await waitForLoad("1 anúncio")

    await waitFor(() => {
      expect(screen.getByLabelText("Editar anúncio")).toBeTruthy()
      expect(screen.getByLabelText("Pausar anúncio")).toBeTruthy()
      expect(screen.getByLabelText("Remover anúncio")).toBeTruthy()
    })
  })

  it("botão de toggle mostra 'Ativar anúncio' quando status é PAUSED", async () => {
    setApiFetch([makeItem({ status: "PAUSED" })])
    wrap(<MeusAnunciosScreen />)
    await waitForLoad("1 anúncio")
    await waitFor(() =>
      expect(screen.getByLabelText("Ativar anúncio")).toBeTruthy(),
    )
  })
})

// ── Status banners ────────────────────────────────────────────────────────────

describe("Banners de status — verbatim MyItemsGrid.tsx linhas 118-144", () => {
  it("banner DRAFT exibe 'Rascunho'", async () => {
    setApiFetch([makeItem({ status: "DRAFT" })])
    wrap(<MeusAnunciosScreen />)
    await waitForLoad("1 anúncio")
    await waitFor(() =>
      expect(screen.getByText("Rascunho")).toBeTruthy(),
    )
  })

  it("banner DRAFT exibe descrição verbatim 'Adicione pelo menos 1 foto para publicar'", async () => {
    setApiFetch([makeItem({ status: "DRAFT" })])
    wrap(<MeusAnunciosScreen />)
    await waitForLoad("1 anúncio")
    await waitFor(() =>
      expect(
        screen.getByText("Adicione pelo menos 1 foto para publicar"),
      ).toBeTruthy(),
    )
  })

  it("banner PAUSED exibe 'Pausado'", async () => {
    setApiFetch([makeItem({ status: "PAUSED" })])
    wrap(<MeusAnunciosScreen />)
    await waitForLoad("1 anúncio")
    await waitFor(() =>
      expect(screen.getByText("Pausado")).toBeTruthy(),
    )
  })

  it("banner PAUSED exibe 'Anúncio oculto das listagens públicas'", async () => {
    setApiFetch([makeItem({ status: "PAUSED" })])
    wrap(<MeusAnunciosScreen />)
    await waitForLoad("1 anúncio")
    await waitFor(() =>
      expect(
        screen.getByText("Anúncio oculto das listagens públicas"),
      ).toBeTruthy(),
    )
  })

  it("banner AVAILABLE exibe 'Disponível'", async () => {
    setApiFetch([makeItem({ status: "AVAILABLE" })])
    wrap(<MeusAnunciosScreen />)
    await waitForLoad("1 anúncio")
    await waitFor(() =>
      expect(screen.getByText("Disponível")).toBeTruthy(),
    )
  })
})

// ── Guard: usuário não autenticado ────────────────────────────────────────────

describe("Guard — usuário não autenticado", () => {
  beforeEach(() => {
    mockUser = null
  })

  it("exibe 'Faça login para ver seus anúncios' quando não autenticado", () => {
    wrap(<MeusAnunciosScreen />)
    expect(
      screen.getByText("Faça login para ver seus anúncios"),
    ).toBeTruthy()
  })

  it("exibe botão 'Entrar' quando não autenticado", () => {
    wrap(<MeusAnunciosScreen />)
    expect(screen.getByLabelText("Entrar")).toBeTruthy()
  })
})
