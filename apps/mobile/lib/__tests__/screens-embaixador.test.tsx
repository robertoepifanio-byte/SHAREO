// Fonte: apps/mobile/app/perfil/embaixador.tsx
//        app/perfil/embaixador/page.tsx + app/perfil/embaixador/_AmbassadorSection.tsx
//
// Testes da tela nativa do Programa Embaixadores.
// Verifica rótulos verbatim e fluxos principais:
//   - Estado de loading
//   - Tier badges (Bronze 3% / Prata 5% / Ouro 7%) — verbatim de TIER_RATES
//   - Banner pré-lançamento — verbatim de _AmbassadorSection.tsx linha 124
//   - Bloco de consentimento LGPD (quando !hasConsented)
//   - Métricas (Indicados / Ativos / Comissão acumulada) — pós-consentimento
//   - Estado vazio (nenhum indicado)
//   - Histórico de comissões
//   - Barra de progresso de tier
//
// RÓTULOS VERBATIM — alteração sem correspondente no componente quebra o CI.
//
// Estratégia de mock: @tanstack/react-query é mockado diretamente para
// evitar conflito de versões de React entre a lib (react@19.2.x) e
// react-test-renderer (react@19.1.x) que produz:
//   "TypeError: Cannot read properties of null (reading 'useEffect')"
// Ao mockar useQuery/useMutation/useQueryClient, não precisamos de QueryClientProvider.

import React from "react"
import { render, screen } from "@testing-library/react-native"

import EmbaixadorScreen from "@/app/perfil/embaixador"

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeStats(overrides: Partial<{
  referralCode:      string | null
  totalReferrals:    number
  activeReferrals:   number
  totalPendingCents: number
  commissions:       Array<{
    id: string; amountCents: number; tierSnapshot: "BRONZE" | "SILVER" | "GOLD"
    status: "PENDING" | "APPROVED" | "PAID" | "CANCELLED"; createdAt: string; referralId: string
  }>
  payoutEnabled:     boolean
}> = {}) {
  return {
    referralCode:      overrides.referralCode      ?? null,
    totalReferrals:    overrides.totalReferrals    ?? 0,
    activeReferrals:   overrides.activeReferrals   ?? 0,
    pendingReferrals:  0,
    commissions:       overrides.commissions       ?? [],
    totalPendingCents: overrides.totalPendingCents ?? 0,
    totalPaidCents:    0,
    payoutEnabled:     overrides.payoutEnabled     ?? false,
    hasBeenReferred:   false,
  }
}

function makeData(hasConsented = false, statsOverrides = {}) {
  return { stats: makeStats(statsOverrides), hasConsented }
}

// ── Estado mutável dos mocks ──────────────────────────────────────────────────

// useQuery retorna diferentes shapes dependendo do status desejado pelo teste.
let mockQueryReturn: {
  data:      ReturnType<typeof makeData> | undefined
  isLoading: boolean
  isError:   boolean
} = {
  data:      makeData(true),
  isLoading: false,
  isError:   false,
}

// useAuth retorna user ou null, controlado pelo teste.
let mockUser: { id: string; name: string; email: string; isVerified: boolean } | null = {
  id:         "user-1",
  name:       "Ana Locatária",
  email:      "ana@test.com",
  isVerified: true,
}

// ── Mocks globais ──────────────────────────────────────────────────────────────

jest.mock("@/lib/api", () => ({
  apiFetch:  jest.fn(),
  API_URL:   "https://staging.shareo.com.br",
  getTokens: jest.fn().mockResolvedValue(null),
}))

jest.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: mockUser, logout: jest.fn(), loading: false }),
}))

jest.mock("@/lib/theme", () => {
  const React = require("react")
  const TOKENS = {
    bg:      "#F8FAFC", surface: "#FFFFFF", text: "#0F172A", muted: "#64748B",
    border:  "#E2E8F0", navy:    "#003366", green: "#007B3C", error: "#C0392B",
    success: "#059669", warning: "#D97706",
    bookingPending:   "#FDE68A", bookingActive:    "#BFDBFE",
    bookingCompleted: "#A7F3D0", bookingCancelled: "#FECACA",
    bookingDisputed:  "#FDE68A",
    disabledBg: "#F1F5F9", disabledText: "#94A3B8", disabledBorder: "#E2E8F0",
  }
  return {
    useTheme:      () => ({ preference: "light", mode: "light", tokens: TOKENS, setPreference: jest.fn() }),
    ThemeProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  }
})

jest.mock("expo-router", () => ({
  router:               { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({}),
  Link:                 ({ children }: { children: React.ReactNode }) => children,
  usePathname:          () => "/",
  useSegments:          () => [],
}))

// @tanstack/react-query: mock completo para evitar conflito de versões de React.
// useQuery retorna mockQueryReturn (controlado por cada teste via setupQuery()).
// useMutation retorna um objeto estático suficiente para a tela renderizar.
// useQueryClient retorna { invalidateQueries: jest.fn() }.
jest.mock("@tanstack/react-query", () => ({
  useQuery:       jest.fn(),
  useMutation:    jest.fn(),
  useQueryClient: jest.fn(),
  QueryClient:    jest.fn(),
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => children,
}))

// react-native-safe-area-context: jest.setup.js não inclui este mock.
// useSafeAreaInsets() lança se não há SafeAreaProvider acima — mockamos aqui.
jest.mock("react-native-safe-area-context", () => {
  const React = require("react")
  return {
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    SafeAreaProvider:  ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    SafeAreaView:      ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  }
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function setupQuery(
  data: ReturnType<typeof makeData> | undefined = makeData(true),
  status: "pending" | "success" | "error" = "success",
) {
  const { useQuery, useMutation, useQueryClient } =
    require("@tanstack/react-query") as {
      useQuery:       jest.Mock
      useMutation:    jest.Mock
      useQueryClient: jest.Mock
    }

  useQueryClient.mockReturnValue({ invalidateQueries: jest.fn() })

  useQuery.mockReturnValue({
    data:      status === "success" ? data : undefined,
    isLoading: status === "pending",
    isError:   status === "error",
  })

  useMutation.mockReturnValue({
    mutate:    jest.fn(),
    isPending: false,
    isError:   false,
  })
}

// ── Testes ────────────────────────────────────────────────────────────────────

describe("EmbaixadorScreen — rótulos verbatim e fluxos principais", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUser = {
      id:         "user-1",
      name:       "Ana Locatária",
      email:      "ana@test.com",
      isVerified: true,
    }
    setupQuery(makeData(true))
  })

  // ── Loading ────────────────────────────────────────────────────────────────

  it("exibe 'Carregando...' enquanto aguarda o fetch", () => {
    setupQuery(undefined, "pending")
    render(<EmbaixadorScreen />)
    expect(screen.getByText("Carregando...")).toBeTruthy()
  })

  // ── Tier badges — verbatim de TIER_ICONS + getTierLabel + TIER_RATES ─────

  it("exibe os 3 labels de tier: Bronze, Prata, Ouro", () => {
    setupQuery(makeData(true, { totalReferrals: 0 }))
    render(<EmbaixadorScreen />)
    expect(screen.getByText("Bronze")).toBeTruthy()
    expect(screen.getByText("Prata")).toBeTruthy()
    expect(screen.getByText("Ouro")).toBeTruthy()
  })

  it("exibe as 3 taxas verbatim: · 3%, · 5%, · 7%", () => {
    setupQuery(makeData(true, { totalReferrals: 0 }))
    render(<EmbaixadorScreen />)
    expect(screen.getByText("· 3%")).toBeTruthy()
    expect(screen.getByText("· 5%")).toBeTruthy()
    expect(screen.getByText("· 7%")).toBeTruthy()
  })

  // ── Banner pré-lançamento — verbatim de _AmbassadorSection.tsx linha 124 ──

  it("exibe o banner 'Programa em pré-lançamento.'", () => {
    setupQuery(makeData(true))
    render(<EmbaixadorScreen />)
    expect(screen.getByText("Programa em pré-lançamento.")).toBeTruthy()
  })

  it("exibe o subtexto do banner verbatim", () => {
    setupQuery(makeData(true))
    render(<EmbaixadorScreen />)
    expect(screen.getByText(/Você já pode indicar amigos e acompanhar suas indicações/)).toBeTruthy()
  })

  // ── Cabeçalho — verbatim do <h1> do site ─────────────────────────────────

  it("exibe o título 'Programa Embaixadores' (pageTitle verbatim)", () => {
    setupQuery(makeData(true))
    render(<EmbaixadorScreen />)
    expect(screen.getAllByText("Programa Embaixadores").length).toBeGreaterThanOrEqual(1)
  })

  it("exibe o subtítulo verbatim do site", () => {
    setupQuery(makeData(true))
    render(<EmbaixadorScreen />)
    expect(screen.getByText(/Bronze · Prata · Ouro — comissões sobre a taxa ShareO/)).toBeTruthy()
  })

  // ── Botão de voltar ────────────────────────────────────────────────────────

  it("exibe botão '← Meu Perfil' (verbatim do site)", () => {
    setupQuery(makeData(true))
    render(<EmbaixadorScreen />)
    expect(screen.getByText("← Meu Perfil")).toBeTruthy()
  })

  // ── Consentimento LGPD — verbatim de _AmbassadorSection.tsx linhas 129-148 ─

  it("exibe bloco 'Antes de começar' quando !hasConsented", () => {
    setupQuery(makeData(false))
    render(<EmbaixadorScreen />)
    expect(screen.getByText("Antes de começar")).toBeTruthy()
  })

  it("exibe botão 'Entendi e aceito' no bloco de consentimento", () => {
    setupQuery(makeData(false))
    render(<EmbaixadorScreen />)
    expect(screen.getByText("Entendi e aceito")).toBeTruthy()
  })

  it("exibe texto da Política de Privacidade verbatim", () => {
    setupQuery(makeData(false))
    render(<EmbaixadorScreen />)
    expect(screen.getByText(/Ao compartilhar seu link de indicação/)).toBeTruthy()
    expect(screen.getByText("Política de Privacidade")).toBeTruthy()
  })

  it("não exibe bloco de consentimento quando hasConsented=true", () => {
    setupQuery(makeData(true))
    render(<EmbaixadorScreen />)
    expect(screen.queryByText("Antes de começar")).toBeNull()
  })

  // ── Métricas — verbatim de MetricCard do site ─────────────────────────────

  it("exibe labels de métricas verbatim: Indicados, Ativos, Comissão acumulada", () => {
    setupQuery(makeData(true, { totalReferrals: 5, activeReferrals: 3, totalPendingCents: 1500 }))
    render(<EmbaixadorScreen />)
    expect(screen.getByText("Indicados")).toBeTruthy()
    // "Ativos" aparece num <Text> que contém texto aninhado "\n12 meses" —
    // RNTL vê o nó inteiro como "Ativos\n12 meses"; usar regex para match parcial.
    expect(screen.getByText(/Ativos/)).toBeTruthy()
    expect(screen.getByText("Comissão acumulada")).toBeTruthy()
  })

  it("exibe nota '12 meses' na métrica Ativos — verbatim de MetricCard nota", () => {
    setupQuery(makeData(true))
    render(<EmbaixadorScreen />)
    expect(screen.getByText("12 meses")).toBeTruthy()
  })

  // ── Estado vazio — verbatim de _AmbassadorSection.tsx linhas 263-273 ──────

  it("exibe 'Você ainda não tem indicados' quando totalReferrals=0 e hasConsented=true", () => {
    setupQuery(makeData(true, { totalReferrals: 0 }))
    render(<EmbaixadorScreen />)
    expect(screen.getByText("Você ainda não tem indicados")).toBeTruthy()
  })

  it("exibe parágrafo do estado vazio verbatim", () => {
    setupQuery(makeData(true, { totalReferrals: 0 }))
    render(<EmbaixadorScreen />)
    expect(screen.getByText(/Compartilhe seu link e comece a ganhar comissões/)).toBeTruthy()
  })

  // ── Link de indicação — verbatim de _AmbassadorSection.tsx linhas 193-234 ─

  it("exibe 'Meu link de indicação' quando hasConsented=true", () => {
    setupQuery(makeData(true, { referralCode: "ANA-XY12" }))
    render(<EmbaixadorScreen />)
    expect(screen.getByText("Meu link de indicação")).toBeTruthy()
  })

  it("exibe botão 'Gerar meu link de indicação' quando referralCode=null", () => {
    setupQuery(makeData(true, { referralCode: null }))
    render(<EmbaixadorScreen />)
    expect(screen.getByText("Gerar meu link de indicação")).toBeTruthy()
  })

  it("exibe botões Compartilhar e WhatsApp quando referralCode existe", () => {
    setupQuery(makeData(true, { referralCode: "ANA-XY12" }))
    render(<EmbaixadorScreen />)
    expect(screen.getByText("Compartilhar")).toBeTruthy()
    expect(screen.getByText("WhatsApp")).toBeTruthy()
  })

  // ── Barra de progresso de tier ────────────────────────────────────────────

  it("exibe 'Próximo: Bronze (3%)' quando activeReferrals=0 e hasConsented=true", () => {
    setupQuery(makeData(true, { activeReferrals: 0, totalReferrals: 1 }))
    render(<EmbaixadorScreen />)
    expect(screen.getByText(/Próximo: Bronze \(3%\)/)).toBeTruthy()
  })

  it("exibe 'Próximo: Prata (5%)' quando activeReferrals=5 (tier Bronze)", () => {
    setupQuery(makeData(true, { activeReferrals: 5, totalReferrals: 5 }))
    render(<EmbaixadorScreen />)
    expect(screen.getByText(/Próximo: Prata \(5%\)/)).toBeTruthy()
  })

  it("exibe label 'Nível atual:' quando há progresso de tier", () => {
    setupQuery(makeData(true, { activeReferrals: 3, totalReferrals: 3 }))
    render(<EmbaixadorScreen />)
    expect(screen.getByText(/Nível atual:/)).toBeTruthy()
  })

  // ── Histórico de comissões ────────────────────────────────────────────────

  it("exibe 'Histórico de comissões' quando há comissões", () => {
    setupQuery(makeData(true, {
      totalReferrals: 1,
      commissions:    [{
        id: "c-1", amountCents: 450, tierSnapshot: "BRONZE",
        status: "PENDING", createdAt: "2026-07-01T10:00:00Z", referralId: "r-1",
      }],
    }))
    render(<EmbaixadorScreen />)
    expect(screen.getByText("Histórico de comissões")).toBeTruthy()
  })

  it("exibe ' · pendente' em comissão PENDING", () => {
    setupQuery(makeData(true, {
      totalReferrals: 1,
      commissions:    [{
        id: "c-2", amountCents: 300, tierSnapshot: "BRONZE",
        status: "PENDING", createdAt: "2026-07-02T10:00:00Z", referralId: "r-2",
      }],
    }))
    render(<EmbaixadorScreen />)
    expect(screen.getByText(" · pendente")).toBeTruthy()
  })

  // ── Guard: não logado ─────────────────────────────────────────────────────

  it("exibe 'Faça login para acessar seu perfil' quando não logado", () => {
    mockUser = null
    setupQuery(undefined)
    render(<EmbaixadorScreen />)
    expect(screen.getByText("Faça login para acessar seu perfil")).toBeTruthy()
  })

  // ── Erro de fetch ─────────────────────────────────────────────────────────

  it("exibe mensagem de erro quando a API retorna erro", () => {
    setupQuery(undefined, "error")
    render(<EmbaixadorScreen />)
    expect(screen.getByText("Erro ao carregar o Programa Embaixadores.")).toBeTruthy()
  })
})
