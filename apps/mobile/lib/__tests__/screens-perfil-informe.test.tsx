// Testes da tela InformeRendimentosScreen.
// Trava de transcrição literal: rótulos verbatim de app/perfil/repasses/informe/page.tsx.
// Fonte: app/perfil/repasses/informe/page.tsx

import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import InformeRendimentosScreen from "@/app/perfil/repasses/informe"

// ── Mocks globais ─────────────────────────────────────────────────────────────

// react-native-safe-area-context: sem native modules em Jest — renderizar children diretamente.
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  useSafeAreaFrame:  () => ({ x: 0, y: 0, width: 390, height: 844 }),
}))

jest.mock("@/lib/api", () => ({
  apiFetch:  jest.fn(),
  API_URL:   "https://staging.shareo.com.br",
  getTokens: jest.fn().mockResolvedValue(null),
}))

jest.mock("@/lib/auth", () => ({
  useAuth: jest.fn((selector: (s: object) => unknown) =>
    selector({ user: null, logout: jest.fn(), loading: false })
  ),
}))

jest.mock("@/lib/theme", () => {
  const React = require("react")
  const LIGHT = {
    bg: "#F8FAFC", surface: "#FFFFFF", text: "#0F172A", muted: "#64748B",
    border: "#E2E8F0", navy: "#003366", green: "#007B3C", error: "#C0392B",
    warning: "#D97706", success: "#059669",
    bookingPending: "#FDE68A", bookingActive: "#BFDBFE",
    bookingCompleted: "#A7F3D0", bookingCancelled: "#FECACA",
    bookingDisputed: "#FDE68A",
    disabledBg: "#F1F5F9", disabledText: "#94A3B8", disabledBorder: "#E2E8F0",
  }
  return {
    useTheme: () => ({ preference: "light", mode: "light", tokens: LIGHT, setPreference: jest.fn() }),
    ThemeProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  }
})

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => ({}),
  Link: ({ children }: { children: React.ReactNode }) => children,
  usePathname: () => "/perfil/repasses/informe",
  useSegments: () => [],
}))

// ── Utilitários ───────────────────────────────────────────────────────────────

function makeQC() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
}

function wrap(ui: React.ReactElement, qc = makeQC()) {
  return render(
    <QueryClientProvider client={qc}>
      {ui}
    </QueryClientProvider>
  )
}

const mockUser = {
  id: "user-1", name: "Maria Silva", email: "maria@example.com",
  role: "USER" as const, avatarUrl: null, isVerified: true,
}

function withUser() {
  const { useAuth } = require("@/lib/auth") as { useAuth: jest.Mock }
  useAuth.mockImplementation((sel: (s: object) => unknown) =>
    sel({ user: mockUser, logout: jest.fn(), loading: false })
  )
}

function withoutUser() {
  const { useAuth } = require("@/lib/auth") as { useAuth: jest.Mock }
  useAuth.mockImplementation((sel: (s: object) => unknown) =>
    sel({ user: null, logout: jest.fn(), loading: false })
  )
}

const currentYear = new Date().getFullYear()

const mockInformeEmpty = {
  year:           currentYear,
  totalPaidCents: 0,
  totalPaidBrl:   "0.00",
  payoutCount:    0,
  account:        null,
  payouts:        [],
}

const mockInformeComRepasses = {
  year:           currentYear,
  totalPaidCents: 28500,
  totalPaidBrl:   "285.00",
  payoutCount:    2,
  account:        { holderName: "Maria Silva", pixKey: "maria@example.com", pixKeyType: "EMAIL" },
  payouts: [
    {
      id:          "pyt-1",
      amount:      15000,
      amountBrl:   "150.00",
      processedAt: "2026-03-10T12:00:00.000Z",
      item:        "Furadeira Bosch",
      bookingId:   "bk-1",
      period:      "2026-03-01 – 2026-03-05",
    },
    {
      id:          "pyt-2",
      amount:      13500,
      amountBrl:   "135.00",
      processedAt: "2026-06-20T12:00:00.000Z",
      item:        "Escada Alumínio 6 degraus",
      bookingId:   "bk-2",
      period:      "2026-06-15 – 2026-06-18",
    },
  ],
}

// ── Testes ────────────────────────────────────────────────────────────────────

describe("InformeRendimentosScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ── Guard: não logado ─────────────────────────────────────────────────────

  it("não logado: exibe 'Faça login para acessar o informe' (verbatim)", () => {
    withoutUser()
    wrap(<InformeRendimentosScreen />)
    expect(screen.getByText("Faça login para acessar o informe")).toBeTruthy()
  })

  it("não logado: botão 'Entrar' presente (verbatim)", () => {
    withoutUser()
    wrap(<InformeRendimentosScreen />)
    expect(screen.getByText("Entrar")).toBeTruthy()
  })

  it("não logado: não chama apiFetch (usuário não autenticado)", () => {
    withoutUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    wrap(<InformeRendimentosScreen />)
    expect(apiFetch).not.toHaveBeenCalled()
  })

  // ── Header e navegação ────────────────────────────────────────────────────

  it("logado: exibe título 'Informe de Rendimentos' (verbatim de page.tsx:85)", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValueOnce(mockInformeEmpty)
    wrap(<InformeRendimentosScreen />)
    expect(await screen.findByText("Informe de Rendimentos")).toBeTruthy()
  })

  it("logado: exibe subtitle verbatim de page.tsx:87-89", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValueOnce(mockInformeEmpty)
    wrap(<InformeRendimentosScreen />)
    expect(
      await screen.findByText(
        "Valores recebidos via repasse ShareO — use para declaração do Imposto de Renda."
      )
    ).toBeTruthy()
  })

  it("logado: back link 'Meus Repasses' presente (verbatim de page.tsx:74)", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValueOnce(mockInformeEmpty)
    wrap(<InformeRendimentosScreen />)
    expect(await screen.findByText("Meus Repasses")).toBeTruthy()
  })

  it("logado: back button chama router.back() ao pressionar", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValueOnce(mockInformeEmpty)
    wrap(<InformeRendimentosScreen />)
    await screen.findByText("Meus Repasses")
    fireEvent.press(screen.getByLabelText("Voltar para Meus Repasses"))
    const { router } = require("expo-router") as { router: { back: jest.Mock } }
    expect(router.back).toHaveBeenCalledTimes(1)
  })

  // ── Seletor de ano ────────────────────────────────────────────────────────

  it("logado: exibe chip do ano atual selecionado por default", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValueOnce(mockInformeEmpty)
    wrap(<InformeRendimentosScreen />)
    await screen.findByText("Informe de Rendimentos")
    expect(screen.getByText(String(currentYear))).toBeTruthy()
  })

  it("logado: exibe label 'Ano' antes dos chips (verbatim de page.tsx:93)", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValueOnce(mockInformeEmpty)
    wrap(<InformeRendimentosScreen />)
    await screen.findByText("Informe de Rendimentos")
    expect(screen.getByText("Ano")).toBeTruthy()
  })

  it("logado: chip 2024 está presente (mínimo de anos disponíveis)", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValueOnce(mockInformeEmpty)
    wrap(<InformeRendimentosScreen />)
    await screen.findByText("Informe de Rendimentos")
    expect(screen.getByText("2024")).toBeTruthy()
  })

  // ── Total card — verbatim de page.tsx linhas 115-128 ─────────────────────

  it("total R$ 0,00 quando não há repasses (verbatim de page.tsx:119)", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValueOnce(mockInformeEmpty)
    wrap(<InformeRendimentosScreen />)
    // fmt(0) = "R$ 0,00"
    expect(await screen.findByText("R$ 0,00")).toBeTruthy()
  })

  it("label 'Total recebido em <ano>' verbatim de page.tsx:118", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValueOnce(mockInformeEmpty)
    wrap(<InformeRendimentosScreen />)
    expect(await screen.findByText(`Total recebido em ${currentYear}`)).toBeTruthy()
  })

  it("'0 repasses concluídos' quando vazio (verbatim de page.tsx:121)", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValueOnce(mockInformeEmpty)
    wrap(<InformeRendimentosScreen />)
    expect(await screen.findByText("0 repasses concluídos")).toBeTruthy()
  })

  it("'2 repasses concluídos' quando há 2 repasses (pluralização verbatim)", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValueOnce(mockInformeComRepasses)
    wrap(<InformeRendimentosScreen />)
    expect(await screen.findByText("2 repasses concluídos")).toBeTruthy()
  })

  it("'1 repasse concluído' no singular (pluralização verbatim de page.tsx:121)", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValueOnce({
      ...mockInformeComRepasses,
      payoutCount:    1,
      totalPaidCents: 15000,
      payouts:        [mockInformeComRepasses.payouts[0]],
    })
    wrap(<InformeRendimentosScreen />)
    expect(await screen.findByText("1 repasse concluído")).toBeTruthy()
  })

  it("total R$ 285,00 com 2 repasses (fmt verbatim de page.tsx:10-11)", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValueOnce(mockInformeComRepasses)
    wrap(<InformeRendimentosScreen />)
    // fmt(28500) = "R$ 285,00"
    const total = await screen.findAllByText("R$ 285,00")
    // Aparece no card de total e no rodapé da lista
    expect(total.length).toBeGreaterThanOrEqual(1)
  })

  // ── Aviso IR — verbatim de page.tsx linhas 131-137 ───────────────────────

  it("aviso IR: 'Declaracao de Imposto de Renda' presente (verbatim sem acentos — texto nativo)", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValueOnce(mockInformeEmpty)
    wrap(<InformeRendimentosScreen />)
    expect(
      await screen.findByText("Declaracao de Imposto de Renda")
    ).toBeTruthy()
  })

  it("aviso IR: menciona 'Consulte seu contador' verbatim de page.tsx:136", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValueOnce(mockInformeEmpty)
    wrap(<InformeRendimentosScreen />)
    expect(await screen.findByText(/Consulte seu contador/)).toBeTruthy()
  })

  // ── Estado vazio — verbatim de page.tsx linhas 141-143 ───────────────────

  it("empty state: 'Nenhum repasse recebido em <ano>.' (verbatim de page.tsx:142)", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValueOnce(mockInformeEmpty)
    wrap(<InformeRendimentosScreen />)
    expect(
      await screen.findByText(`Nenhum repasse recebido em ${currentYear}.`)
    ).toBeTruthy()
  })

  // ── Lista de repasses — verbatim de page.tsx linhas 144-177 ──────────────

  it("lista: título da seção 'Detalhamento — <ano>' verbatim de page.tsx:148", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValueOnce(mockInformeComRepasses)
    wrap(<InformeRendimentosScreen />)
    expect(await screen.findByText(`Detalhamento — ${currentYear}`)).toBeTruthy()
  })

  it("lista: exibe título dos itens (mock 'Furadeira Bosch')", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValueOnce(mockInformeComRepasses)
    wrap(<InformeRendimentosScreen />)
    expect(await screen.findByText("Furadeira Bosch")).toBeTruthy()
  })

  it("lista: exibe 'Escada Alumínio 6 degraus' (segundo repasse)", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValueOnce(mockInformeComRepasses)
    wrap(<InformeRendimentosScreen />)
    expect(await screen.findByText("Escada Alumínio 6 degraus")).toBeTruthy()
  })

  it("lista: exibe 'Locacao: <period>' (verbatim de page.tsx:157-158, sem acento nativo)", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValueOnce(mockInformeComRepasses)
    wrap(<InformeRendimentosScreen />)
    expect(
      await screen.findByText("Locacao: 2026-03-01 – 2026-03-05")
    ).toBeTruthy()
  })

  it("lista: exibe 'Recebido em: <data>' quando processedAt presente (verbatim de page.tsx:159-162)", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValueOnce(mockInformeComRepasses)
    wrap(<InformeRendimentosScreen />)
    // fmtDate("2026-03-10T12:00:00.000Z") = "10/03/2026"
    expect(await screen.findByText("Recebido em: 10/03/2026")).toBeTruthy()
  })

  it("lista: rodapé exibe label 'Total' verbatim de page.tsx:172", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValueOnce(mockInformeComRepasses)
    wrap(<InformeRendimentosScreen />)
    expect(await screen.findByText("Total")).toBeTruthy()
  })

  it("lista: índice '#1' presente (verbatim de page.tsx:164, i+1)", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValueOnce(mockInformeComRepasses)
    wrap(<InformeRendimentosScreen />)
    expect(await screen.findByText("#1")).toBeTruthy()
  })

  // ── Seleção de ano — RE-fetch com novo parâmetro ──────────────────────────

  it("selecionar 2024 chama apiFetch com ?year=2024", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValue(mockInformeEmpty)
    wrap(<InformeRendimentosScreen />)
    await screen.findByText("Informe de Rendimentos")
    fireEvent.press(screen.getByLabelText("Ano 2024"))
    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("year=2024")
      )
    })
  })
})
