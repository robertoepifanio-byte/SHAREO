// Testes de trava da tela nativa de Meus Repasses.
// Fonte: apps/mobile/app/perfil/repasses.tsx (transcrição de app/perfil/repasses/page.tsx)
//
// Verifica:
//   - Guard de não-logado (rótulo verbatim do site)
//   - Estado vazio (rótulo verbatim do site)
//   - Banner de conta PIX (3 estados: sem conta, verificada, aguardando)
//   - Lista de repasses: título do item + valor formatado
//   - Badge de status (COMPLETED → "Pago", PENDING → "Aguardando")

import React from "react"
import { render, screen, waitFor } from "@testing-library/react-native"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { SafeAreaProvider } from "react-native-safe-area-context"

import RepassesScreen from "@/app/perfil/repasses"

// ── Mocks globais ─────────────────────────────────────────────────────────────

jest.mock("@/lib/api", () => ({
  apiFetch: jest.fn().mockResolvedValue({ data: { account: null, payouts: [] } }),
  API_URL:  "https://staging.shareo.com.br",
}))

jest.mock("@/lib/auth", () => ({
  useAuth: jest.fn((selector: (s: object) => unknown) =>
    selector({ user: null, logout: jest.fn(), loading: false })
  ),
}))

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
}))

jest.mock("react-native/Libraries/Linking/Linking", () => ({
  openURL: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  getInitialURL: jest.fn().mockResolvedValue(null),
  canOpenURL: jest.fn().mockResolvedValue(true),
}))

jest.mock("react-native-safe-area-context", () => {
  const insets = { top: 0, right: 0, bottom: 0, left: 0 }
  return {
    useSafeAreaInsets: () => insets,
    SafeAreaProvider:  ({ children }: { children: React.ReactNode }) => children,
    SafeAreaView:      ({ children }: { children: React.ReactNode }) => children,
    initialWindowMetrics: { insets, frame: { x: 0, y: 0, width: 375, height: 812 } },
  }
})

// ── Utilitários ───────────────────────────────────────────────────────────────

function makeQC() {
  return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
}

function wrap(ui: React.ReactElement, qc = makeQC()) {
  return render(
    <SafeAreaProvider>
      <QueryClientProvider client={qc}>
        {ui}
      </QueryClientProvider>
    </SafeAreaProvider>
  )
}

const mockUser = { id: "u1", name: "Ana Souza", email: "ana@test.com", isVerified: true }

function withUser() {
  const { useAuth } = require("@/lib/auth") as { useAuth: jest.Mock }
  useAuth.mockImplementation((selector: (s: object) => unknown) =>
    selector({ user: mockUser, logout: jest.fn(), loading: false })
  )
}

function withoutUser() {
  const { useAuth } = require("@/lib/auth") as { useAuth: jest.Mock }
  useAuth.mockImplementation((selector: (s: object) => unknown) =>
    selector({ user: null, logout: jest.fn(), loading: false })
  )
}

// ── Testes ────────────────────────────────────────────────────────────────────

describe("RepassesScreen", () => {
  beforeEach(() => jest.clearAllMocks())

  // ── Guard de não-logado ────────────────────────────────────────────────────

  it("não logado: exibe guard 'Faça login para ver seus repasses'", () => {
    withoutUser()
    wrap(<RepassesScreen />)
    expect(screen.getByText("Faça login para ver seus repasses")).toBeTruthy()
  })

  it("não logado: exibe botão 'Entrar'", () => {
    withoutUser()
    wrap(<RepassesScreen />)
    expect(screen.getByText("Entrar")).toBeTruthy()
  })

  // ── Header ─────────────────────────────────────────────────────────────────

  it("logado: título 'Meus Repasses' (verbatim do site)", async () => {
    withUser()
    wrap(<RepassesScreen />)
    expect(await screen.findByText("Meus Repasses")).toBeTruthy()
  })

  it("logado: botão '📄 Informe IR' presente (verbatim do site)", async () => {
    withUser()
    wrap(<RepassesScreen />)
    expect(await screen.findByText("📄 Informe IR")).toBeTruthy()
  })

  // ── Descrição verbatim ─────────────────────────────────────────────────────

  // 🪤 Este teste fixava "até o repasse semanal (toda segunda-feira)" como
  // contrato — a frase que a auditoria de 21/08/2026 apontou como falsa (o cron
  // roda diariamente, por janela de N dias). Um teste que congela texto errado
  // transforma a correção em "quebra de teste": este aqui de fato reprovou
  // quando o texto foi consertado.
  //
  // A asserção agora é sobre a REGRA, não sobre a frase: a janela vem da config
  // e o dia fixo da semana não pode voltar.
  it("logado: descreve a retenção pela janela da config, sem dia fixo da semana", async () => {
    withUser()
    wrap(<RepassesScreen />)
    expect(await screen.findByText(/O valor fica retido na plataforma por 3 dias após a confirmação da devolução\./)).toBeTruthy()
    expect(screen.queryByText(/segunda-feira|repasse semanal/i)).toBeNull()
  })

  // ── Banner de conta PIX — sem conta ───────────────────────────────────────

  it("sem conta PIX: exibe 'Cadastre sua chave PIX para receber repasses' (verbatim do site)", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValueOnce({ data: { account: null, payouts: [] } })
    wrap(<RepassesScreen />)
    expect(await screen.findByText("Cadastre sua chave PIX para receber repasses")).toBeTruthy()
  })

  it("sem conta PIX: link 'Cadastrar chave PIX →' (verbatim do site)", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValueOnce({ data: { account: null, payouts: [] } })
    wrap(<RepassesScreen />)
    expect(await screen.findByText("Cadastrar chave PIX →")).toBeTruthy()
  })

  // ── Banner de conta PIX — verificada ──────────────────────────────────────

  it("conta PIX VERIFIED: exibe '✓ Conta PIX verificada' (verbatim do site)", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValueOnce({
      data: {
        account: { id: "a1", pixKey: "ana@test.com", pixKeyType: "EMAIL", holderName: "Ana Souza", status: "VERIFIED" },
        payouts: [],
      },
    })
    wrap(<RepassesScreen />)
    expect(await screen.findByText("✓ Conta PIX verificada")).toBeTruthy()
  })

  // ── Banner de conta PIX — aguardando ──────────────────────────────────────

  it("conta PIX pendente: exibe '⏳ Conta PIX aguardando verificação' (verbatim do site)", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValueOnce({
      data: {
        account: { id: "a1", pixKey: "ana@test.com", pixKeyType: "EMAIL", holderName: "Ana Souza", status: "PENDING_VERIFICATION" },
        payouts: [],
      },
    })
    wrap(<RepassesScreen />)
    expect(await screen.findByText("⏳ Conta PIX aguardando verificação")).toBeTruthy()
  })

  // ── Estado vazio ───────────────────────────────────────────────────────────

  it("sem repasses: exibe estado vazio verbatim do site", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValueOnce({ data: { account: null, payouts: [] } })
    wrap(<RepassesScreen />)
    expect(await screen.findByText(
      "Nenhum repasse ainda. Complete uma locação para receber."
    )).toBeTruthy()
  })

  // ── Lista de repasses ──────────────────────────────────────────────────────

  const mockPayouts = [
    {
      id:            "p1",
      amount:        8500,           // R$ 85,00
      status:        "COMPLETED",
      eligibleAfter: null,
      processedAt:   "2026-06-01T00:00:00Z",
      failureReason: null,
      booking: {
        id:        "b1",
        startDate: "2026-05-20T00:00:00Z",
        endDate:   "2026-05-25T00:00:00Z",
        item:      { title: "Furadeira Bosch" },
      },
    },
    {
      id:            "p2",
      amount:        4500,           // R$ 45,00
      status:        "PENDING",
      eligibleAfter: "2026-06-10T00:00:00Z",
      processedAt:   null,
      failureReason: null,
      booking: {
        id:        "b2",
        startDate: "2026-06-01T00:00:00Z",
        endDate:   "2026-06-04T00:00:00Z",
        item:      { title: "Betoneira elétrica" },
      },
    },
  ]

  it("com repasses: exibe título do item (verbatim)", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValueOnce({
      data: {
        account: { id: "a1", pixKey: "ana@test.com", pixKeyType: "EMAIL", holderName: "Ana Souza", status: "VERIFIED" },
        payouts: mockPayouts,
      },
    })
    wrap(<RepassesScreen />)
    expect(await screen.findByText("Furadeira Bosch")).toBeTruthy()
    expect(await screen.findByText("Betoneira elétrica")).toBeTruthy()
  })

  it("com repasses: badge de status COMPLETED → 'Pago' (verbatim do site)", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValueOnce({
      data: {
        account: { id: "a1", pixKey: "ana@test.com", pixKeyType: "EMAIL", holderName: "Ana Souza", status: "VERIFIED" },
        payouts: [mockPayouts[0]],
      },
    })
    wrap(<RepassesScreen />)
    expect(await screen.findByText("Pago")).toBeTruthy()
  })

  it("com repasses: badge de status PENDING → 'Aguardando' (verbatim do site)", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValueOnce({
      data: {
        account: { id: "a1", pixKey: "ana@test.com", pixKeyType: "EMAIL", holderName: "Ana Souza", status: "VERIFIED" },
        payouts: [mockPayouts[1]],
      },
    })
    wrap(<RepassesScreen />)
    expect(await screen.findByText("Aguardando")).toBeTruthy()
  })

  it("com repasses: card 'Total recebido' exibido (verbatim do site)", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValueOnce({
      data: {
        account: { id: "a1", pixKey: "ana@test.com", pixKeyType: "EMAIL", holderName: "Ana Souza", status: "VERIFIED" },
        payouts: mockPayouts,
      },
    })
    wrap(<RepassesScreen />)
    expect(await screen.findByText("Total recebido")).toBeTruthy()
  })

  it("com repasses: card 'A receber' exibido (verbatim do site)", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValueOnce({
      data: {
        account: { id: "a1", pixKey: "ana@test.com", pixKeyType: "EMAIL", holderName: "Ana Souza", status: "VERIFIED" },
        payouts: mockPayouts,
      },
    })
    wrap(<RepassesScreen />)
    expect(await screen.findByText("A receber")).toBeTruthy()
  })

  it("repasse com failureReason: exibe o motivo de falha", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValueOnce({
      data: {
        account: null,
        payouts: [{
          ...mockPayouts[0],
          status:        "FAILED",
          failureReason: "Chave PIX inválida",
        }],
      },
    })
    wrap(<RepassesScreen />)
    expect(await screen.findByText("Chave PIX inválida")).toBeTruthy()
  })
})
