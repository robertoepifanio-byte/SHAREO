// Fonte: apps/mobile/app/perfil/recebimentos.tsx (transcrito de
// app/perfil/recebimentos/page.tsx — onboarding Stripe Connect, ADR-028)
//
// RÓTULOS VERBATIM — qualquer alteração neste arquivo sem correspondente no
// componente quebrará o CI e sinaliza regressão de transcrição.

import React from "react"
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react-native"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { Linking } from "react-native"

import RecebimentosScreen from "@/app/perfil/recebimentos"

// ── Mocks globais ──────────────────────────────────────────────────────────────

const mockApiFetch = jest.fn()
jest.mock("@/lib/api", () => ({
  apiFetch:  (...args: unknown[]) => mockApiFetch(...args),
  API_URL:   "https://staging.shareo.com.br",
  getTokens: jest.fn().mockResolvedValue(null),
}))

jest.mock("@/lib/auth", () => ({
  useAuth: (selector: (s: unknown) => unknown) =>
    selector({ user: { id: "user-owner", name: "Carlos Proprietário" }, logout: jest.fn(), loading: false }),
}))

jest.mock("@/lib/theme", () => {
  const React = require("react")
  const TOKENS = {
    bg: "#F8FAFC", surface: "#FFFFFF", text: "#0F172A", muted: "#64748B",
    border: "#E2E8F0", navy: "#003366", green: "#007B3C", error: "#C0392B",
    success: "#059669", warning: "#D97706",
  }
  return {
    useTheme: () => ({ preference: "light", mode: "light", tokens: TOKENS, setPreference: jest.fn() }),
    ThemeProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  }
})

// `stripe` mutável por teste — prefixo "mock" para o babel-jest hoist do jest.mock.
let mockStripeParam: string | undefined
jest.mock("expo-router", () => ({
  router:               { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({ stripe: mockStripeParam }),
  Link:                 ({ children }: { children: React.ReactNode }) => children,
  usePathname:          () => "/",
  useSegments:          () => [],
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeAccount(overrides: Record<string, unknown> = {}) {
  return {
    id:                    "acc-1",
    pixKeyType:            "CPF",
    pixKey:                "12345678900",
    holderName:            "Carlos Proprietário",
    bankName:              null,
    status:                "VERIFIED",
    stripeAccountId:       null,
    stripeChargesEnabled:  false,
    stripePayoutsEnabled:  false,
    ...overrides,
  }
}

function makeResponse(overrides: Record<string, unknown> = {}) {
  return {
    account:             makeAccount(),
    feeRateBps:          1500,
    stripeConnectActive: false,
    ...overrides,
  }
}

function makeQC() {
  return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
}

// QueryClient do teste corrente — guardado em módulo para o afterEach encerrar
// as queries e cancelar os timers de garbage collection do react-query.
let queryClient: QueryClient | undefined

function renderScreen() {
  queryClient = makeQC()
  return render(
    <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 375, height: 812 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}>
      <QueryClientProvider client={queryClient}>
        <RecebimentosScreen />
      </QueryClientProvider>
    </SafeAreaProvider>,
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  mockStripeParam = undefined
})

afterEach(async () => {
  // Drena microtasks/timers pendentes das queries e mutations do react-query
  // ANTES do unmount, para que nenhuma atualização de estado assíncrona vaze
  // para fora do act() (origem do warning "not wrapped in act" e da
  // intermitência quando o timing muda sob carga da suíte completa).
  await act(async () => {
    await Promise.resolve()
  })
  // clear() remove as queries do cache e cancela o timer de GC (gcTime: 0
  // agenda um setTimeout que, sem isso, ficava aberto após o teste — causa do
  // "Jest did not exit / asynchronous operations that weren't stopped").
  queryClient?.clear()
  queryClient = undefined
})

// ── Testes ────────────────────────────────────────────────────────────────────

describe("RecebimentosScreen — Stripe Connect (ADR-028)", () => {
  it("não renderiza a seção Stripe quando a flag stripeConnectActive está desligada", async () => {
    mockApiFetch.mockResolvedValueOnce(makeResponse({ stripeConnectActive: false }))
    renderScreen()

    // A descrição é um único <Text> com duas frases (recebimentos.tsx:264-267);
    // o JSX une as linhas num só nó de texto ("...locações. O valor fica...").
    // Casar por substring da 1ª frase (verbatim) evita depender de a frase 2
    // estar concatenada — a causa da falha intermitente deste teste.
    await waitFor(() =>
      expect(
        screen.getByText("Cadastre a chave PIX para receber os repasses das suas locações.", { exact: false }),
      ).toBeTruthy(),
    )
    expect(screen.queryByText("Receber pela Stripe")).toBeNull()
  })

  it("mostra 'Cadastrar dados bancários' quando a flag está ativa e não há conta Stripe conectada", async () => {
    mockApiFetch.mockResolvedValueOnce(makeResponse({ stripeConnectActive: true, account: makeAccount({ stripeAccountId: null }) }))
    renderScreen()

    await waitFor(() => expect(screen.getByText("Receber pela Stripe")).toBeTruthy())
    expect(screen.getByText("Cadastrar dados bancários")).toBeTruthy()
    expect(
      screen.getByText("Cadastre seus dados bancários pela Stripe para receber os repasses automaticamente, sem espera pelo repasse manual."),
    ).toBeTruthy()
  })

  it("mostra 'Continuar cadastro' quando há conta Stripe mas ainda não está pronta", async () => {
    mockApiFetch.mockResolvedValueOnce(
      makeResponse({
        stripeConnectActive: true,
        account: makeAccount({ stripeAccountId: "acct_123", stripeChargesEnabled: false, stripePayoutsEnabled: false }),
      }),
    )
    renderScreen()

    await waitFor(() => expect(screen.getByText("⏳ Cadastro iniciado, verificação da Stripe pendente.")).toBeTruthy())
    expect(screen.getByText("Continuar cadastro")).toBeTruthy()
  })

  it("mostra 'Conta verificada' quando charges e payouts estão habilitados", async () => {
    mockApiFetch.mockResolvedValueOnce(
      makeResponse({
        stripeConnectActive: true,
        account: makeAccount({ stripeAccountId: "acct_123", stripeChargesEnabled: true, stripePayoutsEnabled: true }),
      }),
    )
    renderScreen()

    await waitFor(() => expect(screen.getByText("✅ Conta verificada e pronta para receber.")).toBeTruthy())
  })

  it("ao tocar 'Cadastrar dados bancários', chama POST /api/payments/stripe/connect e abre a URL retornada", async () => {
    mockApiFetch.mockResolvedValueOnce(makeResponse({ stripeConnectActive: true, account: makeAccount({ stripeAccountId: null }) }))
    renderScreen()

    await waitFor(() => expect(screen.getByText("Cadastrar dados bancários")).toBeTruthy())

    mockApiFetch.mockResolvedValueOnce({ data: { url: "https://connect.stripe.com/setup/e/acct_123" } })
    fireEvent.press(screen.getByText("Cadastrar dados bancários"))

    await waitFor(() => expect(Linking.openURL).toHaveBeenCalledWith("https://connect.stripe.com/setup/e/acct_123"))
    expect(mockApiFetch).toHaveBeenCalledWith("/api/payments/stripe/connect", { method: "POST" })
  })

  it("exibe a mensagem de retorno do onboarding quando ?stripe=concluido", async () => {
    mockStripeParam = "concluido"
    mockApiFetch.mockResolvedValueOnce(makeResponse())
    renderScreen()

    await waitFor(() =>
      expect(
        screen.getByText("Dados enviados à Stripe. Assim que a verificação terminar, sua conta fica ativa para receber."),
      ).toBeTruthy(),
    )
  })

  it("exibe a mensagem de erro quando ?stripe=erro", async () => {
    mockStripeParam = "erro"
    mockApiFetch.mockResolvedValueOnce(makeResponse())
    renderScreen()

    await waitFor(() =>
      expect(screen.getByText("Não foi possível conectar à Stripe. Tente novamente.")).toBeTruthy(),
    )
  })
})
