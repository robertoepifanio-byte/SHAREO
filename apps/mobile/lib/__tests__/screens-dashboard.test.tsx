// Testes da tela Dashboard (apps/mobile/app/dashboard.tsx).
// Trava de transcrição literal: rótulos verbatim de app/dashboard/page.tsx
// e sub-componentes {SuggestCard,MonthlyGoalProgress,UpcomingReturns}.tsx.
//
// Mocks globais de expo-secure-store, expo-router, react-native-svg,
// expo-font, safe-area-context, async-storage e expo-image estão em
// apps/mobile/jest.setup.js (executado via setupFilesAfterEnv).

import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { router } from "expo-router"

import DashboardScreen from "@/app/dashboard"

// ── Mocks de dependências ────────────────────────────────────────────────────

jest.mock("@/lib/api", () => ({
  apiFetch:  jest.fn(),
  API_URL:   "https://staging.shareo.com.br",
  getTokens: jest.fn().mockResolvedValue(null),
}))

jest.mock("@/lib/auth", () => ({
  useAuth: jest.fn(),
}))

jest.mock("@/lib/theme", () => {
  const React = require("react")
  const LIGHT = {
    bg:      "#F8FAFC",
    surface: "#FFFFFF",
    text:    "#0F172A",
    muted:   "#64748B",
    border:  "#E2E8F0",
    navy:    "#003366",
    green:   "#007B3C",
    error:   "#C0392B",
    warning: "#F59E0B",
    success: "#007B3C",
    bookingPending:   "#FEF3C7",
    bookingActive:    "#D1FAE5",
    bookingCompleted: "#D1FAE5",
    bookingCancelled: "#FEE2E2",
    bookingDisputed:  "#FEF3C7",
    disabledBg:     "#E2E8F0",
    disabledText:   "#94A3B8",
    disabledBorder: "#CBD5E1",
  }
  return {
    useTheme: () => ({ preference: "light", mode: "light", tokens: LIGHT, setPreference: jest.fn() }),
    ThemeProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  }
})

jest.mock("expo-image", () => ({
  Image: "Image",
}))

jest.mock("expo-router", () => ({
  router:              { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  Link:                ({ children }: { children: React.ReactNode }) => children,
  usePathname:         () => "/dashboard",
  useSegments:         () => [],
  useLocalSearchParams: () => ({}),
}))

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeQC() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
}

function wrap(ui: React.ReactElement, qc = makeQC()) {
  return render(
    <SafeAreaProvider>
      <QueryClientProvider client={qc}>{ui}</QueryClientProvider>
    </SafeAreaProvider>,
  )
}

const mockUser = {
  id:         "user-1",
  name:       "Ana Silva",
  email:      "ana@example.com",
  role:       "USER" as const,
  avatarUrl:  null,
  isVerified: false,
}

function withUser() {
  const { useAuth } = require("@/lib/auth") as { useAuth: jest.Mock }
  useAuth.mockReturnValue({ user: mockUser, logout: jest.fn(), loading: false })
}

function withoutUser() {
  const { useAuth } = require("@/lib/auth") as { useAuth: jest.Mock }
  useAuth.mockReturnValue({ user: null, logout: jest.fn(), loading: false })
}

// Resposta mock com dados completos — cobre todas as seções do dashboard
// profileIncomplete: false (cadastro completo — banner NÃO deve aparecer)
const MOCK_DASHBOARD_DATA = {
  data: {
    itemCount:         3,
    totalViews:        142,
    activeBookings:    2,
    monthEarnings:     15000,  // R$ 150,00
    profileIncomplete: false,
    recentBookings: [
      {
        id:         "booking-1",
        status:     "ACTIVE",
        startDate:  "2026-07-01T10:00:00.000Z",
        endDate:    "2026-07-05T10:00:00.000Z",
        totalPrice: 14000,
        item: {
          title:  "Furadeira Bosch Professional",
          images: [{ url: "https://example.com/furadeira.jpg" }],
        },
      },
      {
        id:         "booking-2",
        status:     "CONFIRMED",
        startDate:  "2026-07-10T10:00:00.000Z",
        endDate:    "2026-07-15T10:00:00.000Z",
        totalPrice: 25000,
        item: {
          title:  "Projetor Epson",
          images: [],
        },
      },
    ],
    suggestions: [
      {
        id:          "item-1",
        title:       "Escada Alumínio 6m",
        pricePerDay: 4500,
        images:      [{ url: "https://example.com/escada.jpg" }],
      },
    ],
    upcomingReturns: [
      {
        id:       "booking-1",
        endDate:  new Date(Date.now() + 2 * 86_400_000).toISOString(),
        item:     { title: "Furadeira Bosch Professional" },
        borrower: { name: "Carlos Mendes" },
      },
    ],
    co2Kg:           3.5,
    treesEquivalent: 0.16,
  },
}

// Resposta mock com cadastro incompleto — banner DEVE aparecer
const MOCK_INCOMPLETE_DATA = {
  data: {
    ...MOCK_DASHBOARD_DATA.data,
    profileIncomplete: true,
  },
}

// Resposta mock vazia — estado sem dados (zero itens, zero reservas)
const MOCK_EMPTY_DATA = {
  data: {
    itemCount:         0,
    totalViews:        0,
    activeBookings:    0,
    monthEarnings:     0,
    profileIncomplete: false,
    recentBookings:    [],
    suggestions:       [],
    upcomingReturns:   [],
    co2Kg:             0,
    treesEquivalent:   0,
  },
}

// ── Testes ───────────────────────────────────────────────────────────────────

describe("DashboardScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ── Guard: não logado ─────────────────────────────────────────────────────
  describe("quando não autenticado", () => {
    it("exibe 'Faça login para acessar o Dashboard' (verbatim)", () => {
      withoutUser()
      wrap(<DashboardScreen />)
      expect(screen.getByText("Faça login para acessar o Dashboard")).toBeTruthy()
    })

    it("exibe botão 'Entrar' (verbatim)", () => {
      withoutUser()
      wrap(<DashboardScreen />)
      expect(screen.getByText("Entrar")).toBeTruthy()
    })

    it("botão 'Entrar' redireciona para login", () => {
      withoutUser()
      const { router } = require("expo-router") as { router: { push: jest.Mock } }
      wrap(<DashboardScreen />)
      fireEvent.press(screen.getByText("Entrar"))
      expect(router.push).toHaveBeenCalledWith("/(auth)/login")
    })

    it("não faz chamada à API quando não logado", () => {
      withoutUser()
      const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
      wrap(<DashboardScreen />)
      expect(apiFetch).not.toHaveBeenCalled()
    })
  })

  // ── Banner de cadastro incompleto — verbatim de dashboard/page.tsx linhas 179-202 ──
  describe("banner de cadastro incompleto", () => {
    it("exibe 'Complete seu cadastro' quando profileIncomplete=true (verbatim)", async () => {
      withUser()
      const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
      apiFetch.mockResolvedValueOnce(MOCK_INCOMPLETE_DATA)
      wrap(<DashboardScreen />)
      expect(await screen.findByText("Complete seu cadastro")).toBeTruthy()
    })

    it("exibe o subtítulo verbatim quando profileIncomplete=true", async () => {
      withUser()
      const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
      apiFetch.mockResolvedValueOnce(MOCK_INCOMPLETE_DATA)
      wrap(<DashboardScreen />)
      // 🪤 <Text> multilinha com inline <Text> — regex parcial no trecho mais curto
      expect(
        await screen.findByText(/Informe CPF e endereço \(ou CNPJ, se for empresa\)/),
      ).toBeTruthy()
    })

    it("exibe botão 'Completar agora' quando profileIncomplete=true (verbatim)", async () => {
      withUser()
      const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
      apiFetch.mockResolvedValueOnce(MOCK_INCOMPLETE_DATA)
      wrap(<DashboardScreen />)
      expect(await screen.findByText("Completar agora")).toBeTruthy()
    })

    it("'Completar agora' navega para /(auth)/completar", async () => {
      withUser()
      const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
      apiFetch.mockResolvedValueOnce(MOCK_INCOMPLETE_DATA)
      const { router: r } = require("expo-router") as { router: { push: jest.Mock } }
      wrap(<DashboardScreen />)
      fireEvent.press(await screen.findByText("Completar agora"))
      expect(r.push).toHaveBeenCalledWith("/(auth)/completar")
    })

    it("NÃO exibe 'Complete seu cadastro' quando profileIncomplete=false", async () => {
      withUser()
      const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
      apiFetch.mockResolvedValueOnce(MOCK_DASHBOARD_DATA) // profileIncomplete: false
      wrap(<DashboardScreen />)
      await screen.findByText("RESERVAS ATIVAS") // aguarda o render
      expect(screen.queryByText("Complete seu cadastro")).toBeNull()
      expect(screen.queryByText("Completar agora")).toBeNull()
    })
  })

  // ── Stat cards ───────────────────────────────────────────────────────────
  describe("navegação", () => {
    it("botão voltar chama router.back() (achado testando no device: tela prendia o usuário sem headerShown)", async () => {
      withUser()
      const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
      apiFetch.mockResolvedValueOnce(MOCK_DASHBOARD_DATA)
      wrap(<DashboardScreen />)
      await screen.findByText("RESERVAS ATIVAS")
      fireEvent.press(screen.getByLabelText("Voltar"))
      expect(router.back).toHaveBeenCalledTimes(1)
    })
  })

  describe("stat cards (verbatim de dashboard/page.tsx linhas 207-225)", () => {
    it("exibe rótulo 'RESERVAS ATIVAS' (verbatim)", async () => {
      withUser()
      const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
      apiFetch.mockResolvedValueOnce(MOCK_DASHBOARD_DATA)
      wrap(<DashboardScreen />)
      expect(await screen.findByText("RESERVAS ATIVAS")).toBeTruthy()
    })

    it("exibe rótulo 'MEUS ITENS' (verbatim)", async () => {
      withUser()
      const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
      apiFetch.mockResolvedValueOnce(MOCK_DASHBOARD_DATA)
      wrap(<DashboardScreen />)
      expect(await screen.findByText("MEUS ITENS")).toBeTruthy()
    })

    it("exibe rótulo 'GANHOS ESTE MÊS' (verbatim)", async () => {
      withUser()
      const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
      apiFetch.mockResolvedValueOnce(MOCK_DASHBOARD_DATA)
      wrap(<DashboardScreen />)
      expect(await screen.findByText("GANHOS ESTE MÊS")).toBeTruthy()
    })

    it("exibe rótulo 'VISUALIZAÇÕES' (verbatim)", async () => {
      withUser()
      const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
      apiFetch.mockResolvedValueOnce(MOCK_DASHBOARD_DATA)
      wrap(<DashboardScreen />)
      expect(await screen.findByText("VISUALIZAÇÕES")).toBeTruthy()
    })

    it("exibe valor de activeBookings mockado (2)", async () => {
      withUser()
      const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
      apiFetch.mockResolvedValueOnce(MOCK_DASHBOARD_DATA)
      wrap(<DashboardScreen />)
      // "2" aparece no stat card de reservas ativas
      expect(await screen.findByText("2")).toBeTruthy()
    })

    it("sub-rótulo 'em andamento' (verbatim)", async () => {
      withUser()
      const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
      apiFetch.mockResolvedValueOnce(MOCK_DASHBOARD_DATA)
      wrap(<DashboardScreen />)
      expect(await screen.findByText("em andamento")).toBeTruthy()
    })

    it("sub-rótulo 'como locador' (verbatim)", async () => {
      withUser()
      const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
      apiFetch.mockResolvedValueOnce(MOCK_DASHBOARD_DATA)
      wrap(<DashboardScreen />)
      expect(await screen.findByText("como locador")).toBeTruthy()
    })

    it("sub-rótulo 'nos seus anúncios' (verbatim)", async () => {
      withUser()
      const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
      apiFetch.mockResolvedValueOnce(MOCK_DASHBOARD_DATA)
      wrap(<DashboardScreen />)
      expect(await screen.findByText("nos seus anúncios")).toBeTruthy()
    })
  })

  // ── Meta mensal — verbatim de MonthlyGoalProgress.tsx ────────────────────
  describe("meta mensal (MonthlyGoalProgress.tsx)", () => {
    it("exibe rótulo 'META MENSAL' (verbatim)", async () => {
      withUser()
      const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
      apiFetch.mockResolvedValueOnce(MOCK_DASHBOARD_DATA)
      wrap(<DashboardScreen />)
      expect(await screen.findByText("META MENSAL")).toBeTruthy()
    })

    it("exibe 'Meta atingida!' quando monthEarnings >= 50000 (verbatim MonthlyGoalProgress.tsx:38)", async () => {
      withUser()
      const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
      apiFetch.mockResolvedValueOnce({
        data: { ...MOCK_DASHBOARD_DATA.data, monthEarnings: 60000 },
      })
      wrap(<DashboardScreen />)
      expect(await screen.findByText("Meta atingida!")).toBeTruthy()
    })

    it("NÃO exibe 'Meta atingida!' quando monthEarnings < 50000", async () => {
      withUser()
      const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
      apiFetch.mockResolvedValueOnce(MOCK_DASHBOARD_DATA) // monthEarnings: 15000
      wrap(<DashboardScreen />)
      await screen.findByText("META MENSAL")
      expect(screen.queryByText("Meta atingida!")).toBeNull()
    })
  })

  // ── Próximas devoluções — verbatim de UpcomingReturns.tsx ────────────────
  describe("próximas devoluções (UpcomingReturns.tsx)", () => {
    it("exibe título 'Próximas devoluções' (verbatim)", async () => {
      withUser()
      const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
      apiFetch.mockResolvedValueOnce(MOCK_DASHBOARD_DATA)
      wrap(<DashboardScreen />)
      expect(await screen.findByText("Próximas devoluções")).toBeTruthy()
    })

    it("exibe 'Locatário: Carlos' (verbatim UpcomingReturns.tsx linha 100)", async () => {
      withUser()
      const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
      apiFetch.mockResolvedValueOnce(MOCK_DASHBOARD_DATA)
      wrap(<DashboardScreen />)
      expect(await screen.findByText("Locatário: Carlos")).toBeTruthy()
    })

    it("exibe botão 'Lembrar' (verbatim UpcomingReturns.tsx linha 133)", async () => {
      withUser()
      const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
      apiFetch.mockResolvedValueOnce(MOCK_DASHBOARD_DATA)
      wrap(<DashboardScreen />)
      expect(await screen.findByText("Lembrar")).toBeTruthy()
    })

    it("NÃO exibe seção de devoluções quando upcomingReturns está vazio (verbatim dashboard/page.tsx linha 234)", async () => {
      withUser()
      const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
      apiFetch.mockResolvedValueOnce(MOCK_EMPTY_DATA)
      wrap(<DashboardScreen />)
      await screen.findByText("META MENSAL")
      expect(screen.queryByText("Próximas devoluções")).toBeNull()
    })
  })

  // ── Reservas recentes — verbatim de dashboard/page.tsx linhas 241-273 ────
  describe("reservas recentes", () => {
    it("exibe título 'Minhas Reservas' (verbatim)", async () => {
      withUser()
      const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
      apiFetch.mockResolvedValueOnce(MOCK_DASHBOARD_DATA)
      wrap(<DashboardScreen />)
      expect(await screen.findByText("Minhas Reservas")).toBeTruthy()
    })

    it("exibe 'Ver histórico →' (verbatim)", async () => {
      withUser()
      const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
      apiFetch.mockResolvedValueOnce(MOCK_DASHBOARD_DATA)
      wrap(<DashboardScreen />)
      expect(await screen.findByText("Ver histórico →")).toBeTruthy()
    })

    it("exibe título do item da reserva recente", async () => {
      // Usa "Projetor Epson" (recentBookings[1]) que só aparece em recentBookings,
      // não em upcomingReturns — evita múltiplos matches que quebrariam findByText.
      withUser()
      const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
      apiFetch.mockResolvedValueOnce(MOCK_DASHBOARD_DATA)
      wrap(<DashboardScreen />)
      expect(await screen.findByText("Projetor Epson")).toBeTruthy()
    })

    it("exibe status 'Em andamento' (BOOKING_STATUS_LABEL.ACTIVE — verbatim BookingStatusBadge.tsx)", async () => {
      withUser()
      const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
      apiFetch.mockResolvedValueOnce(MOCK_DASHBOARD_DATA)
      wrap(<DashboardScreen />)
      expect(await screen.findByText("Em andamento")).toBeTruthy()
    })

    it("exibe status 'Confirmada' (BOOKING_STATUS_LABEL.CONFIRMED — verbatim BookingStatusBadge.tsx)", async () => {
      withUser()
      const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
      apiFetch.mockResolvedValueOnce(MOCK_DASHBOARD_DATA)
      wrap(<DashboardScreen />)
      expect(await screen.findByText("Confirmada")).toBeTruthy()
    })

    it("NÃO exibe seção de reservas quando recentBookings está vazio (verbatim dashboard/page.tsx linha 241)", async () => {
      withUser()
      const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
      apiFetch.mockResolvedValueOnce(MOCK_EMPTY_DATA)
      wrap(<DashboardScreen />)
      await screen.findByText("META MENSAL")
      expect(screen.queryByText("Minhas Reservas")).toBeNull()
    })
  })

  // ── Sugestões — verbatim de SuggestCard.tsx ──────────────────────────────
  describe("sugestões para você", () => {
    it("exibe título 'Sugestões para Você' (verbatim)", async () => {
      withUser()
      const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
      apiFetch.mockResolvedValueOnce(MOCK_DASHBOARD_DATA)
      wrap(<DashboardScreen />)
      expect(await screen.findByText("Sugestões para Você")).toBeTruthy()
    })

    it("exibe 'Ver mais →' (verbatim)", async () => {
      withUser()
      const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
      apiFetch.mockResolvedValueOnce(MOCK_DASHBOARD_DATA)
      wrap(<DashboardScreen />)
      expect(await screen.findByText("Ver mais →")).toBeTruthy()
    })

    it("exibe título do item sugerido", async () => {
      withUser()
      const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
      apiFetch.mockResolvedValueOnce(MOCK_DASHBOARD_DATA)
      wrap(<DashboardScreen />)
      expect(await screen.findByText("Escada Alumínio 6m")).toBeTruthy()
    })

    it("exibe preço com '/dia' (verbatim SuggestCard.tsx linha 51)", async () => {
      withUser()
      const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
      apiFetch.mockResolvedValueOnce(MOCK_DASHBOARD_DATA)
      wrap(<DashboardScreen />)
      expect(await screen.findByText("/dia")).toBeTruthy()
    })

    it("NÃO exibe seção quando suggestions está vazio (verbatim dashboard/page.tsx linha 276)", async () => {
      withUser()
      const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
      apiFetch.mockResolvedValueOnce(MOCK_EMPTY_DATA)
      wrap(<DashboardScreen />)
      await screen.findByText("META MENSAL")
      expect(screen.queryByText("Sugestões para Você")).toBeNull()
    })
  })

  // ── Ações rápidas — verbatim de dashboard/page.tsx linhas 291-354 ─────────
  describe("ações rápidas", () => {
    it("exibe 'Ações rápidas' (verbatim)", async () => {
      withUser()
      const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
      apiFetch.mockResolvedValueOnce(MOCK_DASHBOARD_DATA)
      wrap(<DashboardScreen />)
      expect(await screen.findByText("Ações rápidas")).toBeTruthy()
    })

    it("exibe 'Criar anúncio' (verbatim)", async () => {
      withUser()
      const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
      apiFetch.mockResolvedValueOnce(MOCK_DASHBOARD_DATA)
      wrap(<DashboardScreen />)
      expect(await screen.findByText("Criar anúncio")).toBeTruthy()
    })

    it("exibe 'Anuncie um item para alugar' (verbatim)", async () => {
      withUser()
      const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
      apiFetch.mockResolvedValueOnce(MOCK_DASHBOARD_DATA)
      wrap(<DashboardScreen />)
      expect(await screen.findByText("Anuncie um item para alugar")).toBeTruthy()
    })

    it("exibe 'Meus anúncios' (verbatim)", async () => {
      withUser()
      const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
      apiFetch.mockResolvedValueOnce(MOCK_DASHBOARD_DATA)
      wrap(<DashboardScreen />)
      expect(await screen.findByText("Meus anúncios")).toBeTruthy()
    })

    it("exibe 'Explorar itens' (verbatim)", async () => {
      withUser()
      const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
      apiFetch.mockResolvedValueOnce(MOCK_DASHBOARD_DATA)
      wrap(<DashboardScreen />)
      expect(await screen.findByText("Explorar itens")).toBeTruthy()
    })

    it("exibe 'Chat' (verbatim)", async () => {
      withUser()
      const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
      apiFetch.mockResolvedValueOnce(MOCK_DASHBOARD_DATA)
      wrap(<DashboardScreen />)
      expect(await screen.findByText("Chat")).toBeTruthy()
    })

    it("'Criar anúncio' navega para /itens/novo", async () => {
      withUser()
      const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
      const { router }   = require("expo-router") as { router: { push: jest.Mock } }
      apiFetch.mockResolvedValueOnce(MOCK_DASHBOARD_DATA)
      wrap(<DashboardScreen />)
      fireEvent.press(await screen.findByText("Criar anúncio"))
      expect(router.push).toHaveBeenCalledWith("/itens/novo")
    })
  })

  // ── ShareO Sustentável — verbatim de dashboard/page.tsx linhas 357-378 ───
  describe("shareO Sustentável", () => {
    it("exibe 'ShareO Sustentável' (verbatim)", async () => {
      withUser()
      const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
      apiFetch.mockResolvedValueOnce(MOCK_DASHBOARD_DATA)
      wrap(<DashboardScreen />)
      expect(await screen.findByText("ShareO Sustentável")).toBeTruthy()
    })

    it("exibe 'Iniciativas de economia circular na sua região' (verbatim)", async () => {
      withUser()
      const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
      apiFetch.mockResolvedValueOnce(MOCK_DASHBOARD_DATA)
      wrap(<DashboardScreen />)
      expect(await screen.findByText("Iniciativas de economia circular na sua região")).toBeTruthy()
    })

    it("exibe 'Troca Circular' (verbatim)", async () => {
      withUser()
      const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
      apiFetch.mockResolvedValueOnce(MOCK_DASHBOARD_DATA)
      wrap(<DashboardScreen />)
      expect(await screen.findByText("Troca Circular")).toBeTruthy()
    })

    it("exibe 'Eco Centro' (verbatim)", async () => {
      withUser()
      const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
      apiFetch.mockResolvedValueOnce(MOCK_DASHBOARD_DATA)
      wrap(<DashboardScreen />)
      expect(await screen.findByText("Eco Centro")).toBeTruthy()
    })

    it("exibe 'Reciclagem Local' (verbatim)", async () => {
      withUser()
      const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
      apiFetch.mockResolvedValueOnce(MOCK_DASHBOARD_DATA)
      wrap(<DashboardScreen />)
      expect(await screen.findByText("Reciclagem Local")).toBeTruthy()
    })
  })

  // ── CO₂ Bar — verbatim de dashboard/page.tsx linhas 381-394 ─────────────
  describe("CO₂ bar", () => {
    it("exibe 'Comece a alugar e economize CO₂' quando co2Kg === 0 (verbatim dashboard/page.tsx linha 385)", async () => {
      withUser()
      const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
      apiFetch.mockResolvedValueOnce(MOCK_EMPTY_DATA)
      wrap(<DashboardScreen />)
      expect(await screen.findByText("Comece a alugar e economize CO₂")).toBeTruthy()
    })

    it("exibe valor de CO₂ quando co2Kg > 0", async () => {
      withUser()
      const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
      apiFetch.mockResolvedValueOnce(MOCK_DASHBOARD_DATA) // co2Kg: 3.5
      wrap(<DashboardScreen />)
      expect(await screen.findByText("3.5 kg CO₂")).toBeTruthy()
    })
  })

  // ── Estado vazio completo (zero itens, zero reservas) ────────────────────
  describe("estado vazio", () => {
    it("exibe stat cards mesmo com dados zerados", async () => {
      withUser()
      const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
      apiFetch.mockResolvedValueOnce(MOCK_EMPTY_DATA)
      wrap(<DashboardScreen />)
      expect(await screen.findByText("RESERVAS ATIVAS")).toBeTruthy()
      expect(await screen.findByText("MEUS ITENS")).toBeTruthy()
    })

    it("exibe ações rápidas mesmo sem dados", async () => {
      withUser()
      const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
      apiFetch.mockResolvedValueOnce(MOCK_EMPTY_DATA)
      wrap(<DashboardScreen />)
      expect(await screen.findByText("Ações rápidas")).toBeTruthy()
    })

    it("exibe ShareO Sustentável mesmo sem dados", async () => {
      withUser()
      const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
      apiFetch.mockResolvedValueOnce(MOCK_EMPTY_DATA)
      wrap(<DashboardScreen />)
      expect(await screen.findByText("ShareO Sustentável")).toBeTruthy()
    })
  })

  // ── Estado de carregamento ────────────────────────────────────────────────
  describe("estado de carregamento", () => {
    it("exibe 'Carregando...' durante fetch (verbatim)", async () => {
      withUser()
      const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
      // Promessa pendente para manter estado loading
      apiFetch.mockReturnValueOnce(new Promise(() => undefined))
      wrap(<DashboardScreen />)
      expect(screen.getByText("Carregando...")).toBeTruthy()
    })
  })

  // ── Estado de erro ────────────────────────────────────────────────────────
  describe("estado de erro", () => {
    it("exibe mensagem de erro quando API falha", async () => {
      withUser()
      const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
      apiFetch.mockRejectedValueOnce(new Error("Network error"))
      wrap(<DashboardScreen />)
      expect(
        await screen.findByText("Não foi possível carregar o Dashboard"),
      ).toBeTruthy()
    })

    it("exibe botão 'Tentar novamente' quando há erro", async () => {
      withUser()
      const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
      apiFetch.mockRejectedValueOnce(new Error("Network error"))
      wrap(<DashboardScreen />)
      expect(await screen.findByText("Tentar novamente")).toBeTruthy()
    })
  })
})
