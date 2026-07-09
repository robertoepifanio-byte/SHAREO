// Testes da tela de verificação de identidade (apps/mobile/app/kyc.tsx).
// Trava de transcrição literal: rótulos verbatim de app/perfil/documentos/page.tsx
// + app/perfil/_IdVerification.tsx (a tela do site que kyc.tsx transcreve).
// Rótulo inventado = CI quebra (regra de transcrição, CLAUDE.md).
//
// Mocks globais de expo-secure-store, expo-router, react-native-svg,
// expo-font, safe-area-context, async-storage e expo-image estão em
// apps/mobile/jest.setup.js (setupFilesAfterEnv).

import React from "react"
import { render, screen, waitFor } from "@testing-library/react-native"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { SafeAreaProvider } from "react-native-safe-area-context"

import KycScreen from "@/app/kyc"

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

jest.mock("expo-image-picker", () => ({
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
  launchImageLibraryAsync:             jest.fn().mockResolvedValue({ canceled: true, assets: [] }),
}))

jest.mock("expo-router", () => ({
  router:               { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  Link:                 ({ children }: { children: React.ReactNode }) => children,
  usePathname:          () => "/kyc",
  useSegments:          () => [],
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

// kyc.tsx usa selector: useAuth((s) => s.user)
function withUser() {
  const { useAuth } = require("@/lib/auth") as { useAuth: jest.Mock }
  const state = { user: mockUser, logout: jest.fn(), loading: false }
  useAuth.mockImplementation((sel?: (s: object) => unknown) => (sel ? sel(state) : state))
}

function withoutUser() {
  const { useAuth } = require("@/lib/auth") as { useAuth: jest.Mock }
  const state = { user: null, logout: jest.fn(), loading: false }
  useAuth.mockImplementation((sel?: (s: object) => unknown) => (sel ? sel(state) : state))
}

// Shape de GET /api/users/me/id-verification (rota dedicada da tela)
function mockKycResponse(overrides: Partial<{
  idVerificationStatus: string | null
  idRejectionReason:    string | null
  maskedDocument:       string | null
  docLabel:             string
}> = {}) {
  const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
  apiFetch.mockResolvedValue({
    data: {
      idVerificationStatus:     null,
      idRejectionReason:        null,
      maskedDocument:           "***.***.***-42",
      docLabel:                 "CPF",
      biometricConsentRequired: false,
      hasBiometricConsent:      false,
      ...overrides,
    },
  })
}

afterEach(() => jest.clearAllMocks())

// ── Guard: não autenticado ────────────────────────────────────────────────────

describe("KycScreen — sem login", () => {
  it("exibe o gate de login com rótulos exatos", () => {
    withoutUser()
    wrap(<KycScreen />)
    expect(screen.getByText("Faça login para verificar sua identidade")).toBeTruthy()
    expect(screen.getByText("Entrar")).toBeTruthy()
  })
})

// ── Formulário (status null) ─────────────────────────────────────────────────

describe("KycScreen — formulário de envio", () => {
  it("exibe os rótulos verbatim do site (documentos/page.tsx + _IdVerification.tsx)", async () => {
    withUser()
    mockKycResponse()
    wrap(<KycScreen />)

    // Header da tela + título do card explicativo (page.tsx:89)
    await waitFor(() =>
      expect(screen.getAllByText("Verificação de identidade").length).toBeGreaterThanOrEqual(1),
    )

    // Texto explicativo verbatim (page.tsx:90-91)
    expect(
      screen.getByText(
        "A verificação de identidade aumenta a confiança dos outros usuários e desbloqueia locações de maior valor.",
      ),
    ).toBeTruthy()

    // Card "Documento cadastrado" (page.tsx:64-85)
    expect(screen.getByText("CPF cadastrado")).toBeTruthy()
    expect(screen.getByText("***.***.***-42")).toBeTruthy()
    expect(screen.getByText("🔒 Protegido")).toBeTruthy()
    expect(screen.getByText(/criptografado com AES-256-GCM/)).toBeTruthy()
    expect(screen.getByText(/LGPD art\. 46/)).toBeTruthy()

    // Uploads (_IdVerification.tsx)
    expect(screen.getByText(/1\. Foto do documento \(RG ou CNH\)/)).toBeTruthy()
    expect(screen.getByText("Selecionar documento")).toBeTruthy()
    expect(screen.getByText("RG, CNH ou Passaporte")).toBeTruthy()
    expect(screen.getByText(/2\. Selfie segurando o documento/)).toBeTruthy()
    expect(screen.getByText("Tirar selfie")).toBeTruthy()
    expect(screen.getByText("Com o documento ao lado do rosto")).toBeTruthy()

    // CTA + rodapé
    expect(screen.getByText("Enviar para verificação")).toBeTruthy()
    expect(screen.getByText("Análise em até 2 dias úteis · privacidade@shareo.com.br")).toBeTruthy()
  })

  it("CTA fica desabilitado sem documento e selfie selecionados", async () => {
    withUser()
    mockKycResponse()
    wrap(<KycScreen />)

    const cta = await screen.findByLabelText("Enviar documentos para verificação")
    expect(cta.props.accessibilityState?.disabled).toBe(true)
  })

  it("sem documento cadastrado, exibe o texto de vazio verbatim", async () => {
    withUser()
    mockKycResponse({ maskedDocument: null })
    wrap(<KycScreen />)

    expect(
      await screen.findByText(/Nenhum CPF cadastrado\. Acesse seu perfil para adicionar\./),
    ).toBeTruthy()
  })

  it("usuário PJ vê CNPJ como rótulo do documento", async () => {
    withUser()
    mockKycResponse({ docLabel: "CNPJ", maskedDocument: "**.***.***/****-01" })
    wrap(<KycScreen />)

    expect(await screen.findByText("CNPJ cadastrado")).toBeTruthy()
    expect(screen.getByText("**.***.***/****-01")).toBeTruthy()
  })
})

// ── Estados de verificação ───────────────────────────────────────────────────

describe("KycScreen — status de verificação", () => {
  it("VERIFIED: banner verbatim e formulário oculto", async () => {
    withUser()
    mockKycResponse({ idVerificationStatus: "VERIFIED" })
    wrap(<KycScreen />)

    expect(await screen.findByText("Identidade verificada")).toBeTruthy()
    expect(screen.getByText("Sua identidade foi verificada pela equipe ShareO.")).toBeTruthy()
    expect(screen.queryByText("Enviar para verificação")).toBeNull()
  })

  it("PENDING: banner 'Em análise' verbatim e formulário oculto", async () => {
    withUser()
    mockKycResponse({ idVerificationStatus: "PENDING" })
    wrap(<KycScreen />)

    expect(await screen.findByText("Em análise")).toBeTruthy()
    expect(
      screen.getByText(
        "Documentos enviados. Nossa equipe está analisando — você receberá um e-mail em até 2 dias úteis.",
      ),
    ).toBeTruthy()
    expect(screen.queryByText("Enviar para verificação")).toBeNull()
  })

  it("REJECTED: exibe o motivo REAL do admin (paridade _IdVerification.tsx:173-174)", async () => {
    withUser()
    mockKycResponse({
      idVerificationStatus: "REJECTED",
      idRejectionReason:    "Foto do documento ilegível — reenvie com boa iluminação.",
    })
    wrap(<KycScreen />)

    expect(await screen.findByText("Documentos rejeitados")).toBeTruthy()
    expect(screen.getByText("Foto do documento ilegível — reenvie com boa iluminação.")).toBeTruthy()
    // Rejeitado ainda pode reenviar — formulário visível
    expect(screen.getByText("Enviar para verificação")).toBeTruthy()
  })

  it("REJECTED sem motivo: usa a mensagem genérica verbatim", async () => {
    withUser()
    mockKycResponse({ idVerificationStatus: "REJECTED", idRejectionReason: null })
    wrap(<KycScreen />)

    expect(
      await screen.findByText("Por favor envie novos documentos mais legíveis."),
    ).toBeTruthy()
  })
})
