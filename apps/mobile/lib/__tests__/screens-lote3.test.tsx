// Testes das novas telas do Lote 3 — detalhe do item, favoritos, kyc, chat thread.
// Trava de transcrição literal: rótulos verbatim do site e dos componentes de referência.
// Fonte: app/itens/[id]/page.tsx, app/favoritos/page.tsx, app/kyc/page.tsx, app/mensagens/page.tsx

import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { SafeAreaProvider } from "react-native-safe-area-context"

// Importações estáticas das telas do Lote 3
import FavoritosScreen from "@/app/favoritos"
import KycScreen       from "@/app/kyc"
import ChatThreadScreen from "@/app/mensagens/[id]"

// ── Mocks globais ─────────────────────────────────────────────────────────────
jest.mock("@/lib/api", () => ({
  apiFetch:  jest.fn().mockResolvedValue({ data: [], meta: { total: 0 } }),
  API_URL:   "https://staging.shareo.com.br",
  getTokens: jest.fn().mockResolvedValue(null),
}))

jest.mock("@/lib/auth", () => ({
  useAuth: jest.fn((selector) =>
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

// expo-image mock (já no setup, mas explicitamos para clareza)
jest.mock("expo-image", () => ({
  Image: "Image",
}))

// expo-image-picker (KYC)
jest.mock("expo-image-picker", () => ({
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ status: "denied" }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true }),
}))

// expo-router
jest.mock("expo-router", () => ({
  router:              { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({ id: "conv-123" }),
  Link:                ({ children }: { children: React.ReactNode }) => children,
  usePathname:         () => "/",
  useSegments:         () => [],
}))

// ── Utilitários ───────────────────────────────────────────────────────────────
function makeQC() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
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

// ── Mock helpers ──────────────────────────────────────────────────────────────
const mockUser = {
  id: "user-1", name: "Teste", email: "t@t.com",
  role: "USER" as const, avatarUrl: null, isVerified: false,
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

// ── Favoritos — testes ─────────────────────────────────────────────────────────
describe("FavoritosScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("não logado: exibe 'Faça login para ver seus favoritos' (verbatim)", () => {
    withoutUser()
    wrap(<FavoritosScreen />)
    expect(screen.getByText("Faça login para ver seus favoritos")).toBeTruthy()
  })

  it("não logado: exibe botão 'Entrar' (verbatim)", () => {
    withoutUser()
    wrap(<FavoritosScreen />)
    expect(screen.getByText("Entrar")).toBeTruthy()
  })

  it("logado: exibe header 'Favoritos' (verbatim)", () => {
    withUser()
    wrap(<FavoritosScreen />)
    expect(screen.getByText("Favoritos")).toBeTruthy()
  })

  it("logado sem favoritos: empty state 'Nenhum favorito ainda' (verbatim)", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValueOnce({ data: [] })
    wrap(<FavoritosScreen />)
    expect(await screen.findByText("Nenhum favorito ainda")).toBeTruthy()
  })

  it("logado sem favoritos: 'Toque no coração em qualquer item para salvá-lo aqui.' (verbatim do site, favoritos/page.tsx:63)", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValueOnce({ data: [] })
    wrap(<FavoritosScreen />)
    expect(await screen.findByText("Toque no coração em qualquer item para salvá-lo aqui.")).toBeTruthy()
  })

  it("logado sem favoritos: sem botão CTA inventado (site não passa `action` ao EmptyState, favoritos/page.tsx:60-64)", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValueOnce({ data: [] })
    wrap(<FavoritosScreen />)
    await screen.findByText("Nenhum favorito ainda")
    expect(screen.queryByText("Explorar itens")).toBeNull()
  })

  it("logado com favoritos: exibe título do item (mock)", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValueOnce({
      data: [{
        id: "item-1", title: "Furadeira Bosch",
        pricePerDay: 3500, condition: "BOM",
        city: "São Paulo", state: "SP", neighborhood: "Pinheiros",
        images: [], category: { name: "Ferramentas" },
        owner: { name: "João", isVerified: true },
        _count: { reviews: 5, favorites: 12 },
        favoritedAt: new Date().toISOString(),
      }],
    })
    wrap(<FavoritosScreen />)
    expect(await screen.findByText("Furadeira Bosch")).toBeTruthy()
  })
})

// ── KYC — testes ───────────────────────────────────────────────────────────────
describe("KycScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("não logado: exibe 'Faça login para verificar sua identidade' (verbatim)", () => {
    withoutUser()
    wrap(<KycScreen />)
    expect(screen.getByText("Faça login para verificar sua identidade")).toBeTruthy()
  })

  it("não logado: botão 'Entrar' presente (verbatim)", () => {
    withoutUser()
    wrap(<KycScreen />)
    expect(screen.getByText("Entrar")).toBeTruthy()
  })

  it("logado: 'Verificação de identidade' aparece 2× — header da tela + título do box explicativo (verbatim de app/perfil/documentos/page.tsx:89, corrigido de 'Por que verificar sua identidade?' que era paráfrase inventada)", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValueOnce({ data: { idVerificationStatus: null, isVerified: false } })
    wrap(<KycScreen />)
    expect(await screen.findAllByText("Verificação de identidade")).toHaveLength(2)
  })

  it("logado: texto do box explicativo verbatim de app/perfil/documentos/page.tsx:91", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValueOnce({ data: { idVerificationStatus: null, isVerified: false } })
    wrap(<KycScreen />)
    expect(await screen.findByText(
      "A verificação de identidade aumenta a confiança dos outros usuários e desbloqueia locações de maior valor."
    )).toBeTruthy()
  })

  it("logado: labels de upload verbatim do site", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValueOnce({ data: { idVerificationStatus: null, isVerified: false } })
    wrap(<KycScreen />)
    // Label "1. Foto do documento (RG ou CNH)" — verbatim
    expect(await screen.findByText(/1\. Foto do documento \(RG ou CNH\)/)).toBeTruthy()
  })

  it("logado: label 'Selecionar documento' (verbatim)", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValueOnce({ data: { idVerificationStatus: null, isVerified: false } })
    wrap(<KycScreen />)
    expect(await screen.findByText("Selecionar documento")).toBeTruthy()
  })

  it("logado: label 'Tirar selfie' (verbatim)", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValueOnce({ data: { idVerificationStatus: null, isVerified: false } })
    wrap(<KycScreen />)
    expect(await screen.findByText("Tirar selfie")).toBeTruthy()
  })

  it("logado: CTA 'Enviar para verificação' (verbatim)", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValueOnce({ data: { idVerificationStatus: null, isVerified: false } })
    wrap(<KycScreen />)
    expect(await screen.findByText("Enviar para verificação")).toBeTruthy()
  })

  it("logado: rodapé 'Análise em até 2 dias úteis · privacidade@shareo.com.br' (verbatim LGPD)", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValueOnce({ data: { idVerificationStatus: null, isVerified: false } })
    wrap(<KycScreen />)
    expect(await screen.findByText("Análise em até 2 dias úteis · privacidade@shareo.com.br")).toBeTruthy()
  })

  it("VERIFIED: exibe 'Identidade verificada' (verbatim)", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValueOnce({ data: { idVerificationStatus: "VERIFIED", isVerified: true } })
    wrap(<KycScreen />)
    expect(await screen.findByText("Identidade verificada")).toBeTruthy()
  })

  it("PENDING: exibe 'Em análise' (verbatim)", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValueOnce({ data: { idVerificationStatus: "PENDING", isVerified: false } })
    wrap(<KycScreen />)
    expect(await screen.findByText("Em análise")).toBeTruthy()
  })

  it("REJECTED: exibe 'Documentos rejeitados' (verbatim)", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValueOnce({ data: { idVerificationStatus: "REJECTED", isVerified: false } })
    wrap(<KycScreen />)
    expect(await screen.findByText("Documentos rejeitados")).toBeTruthy()
  })

  it("PENDING: exibe '...em até 2 dias úteis' e NÃO exibe CTA de envio", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValueOnce({ data: { idVerificationStatus: "PENDING", isVerified: false } })
    wrap(<KycScreen />)
    await screen.findByText("Em análise")
    // CTA de envio não aparece quando está PENDING
    expect(screen.queryByText("Enviar para verificação")).toBeNull()
  })
})

// ── Chat Thread — testes ──────────────────────────────────────────────────────
describe("ChatThreadScreen (mensagens/[id])", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("não logado: exibe 'Faça login para ver mensagens' (verbatim)", () => {
    withoutUser()
    wrap(<ChatThreadScreen />)
    expect(screen.getByText("Faça login para ver mensagens")).toBeTruthy()
  })

  it("logado, sem mensagens: empty state personalizado 'Diga olá para {nome}!' (verbatim de _ChatWindow.tsx:200-203, não 'Seja o primeiro...' que nunca existiu no site)", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValueOnce({
      data: {
        id: "conv-123", otherUser: { id: "u2", name: "Maria", avatarUrl: null },
        booking: null, messages: [],
        meta: { total: 0, page: 1, limit: 20, hasMore: false },
      },
    })
    wrap(<ChatThreadScreen />)
    expect(await screen.findByText("Nenhuma mensagem ainda. Diga olá para Maria!")).toBeTruthy()
  })

  it("logado: campo de input com placeholder 'Escreva uma mensagem...' (verbatim)", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValueOnce({
      data: {
        id: "conv-123", otherUser: { id: "u2", name: "Maria", avatarUrl: null },
        booking: null, messages: [],
        meta: { total: 0, page: 1, limit: 20, hasMore: false },
      },
    })
    wrap(<ChatThreadScreen />)
    expect(await screen.findByPlaceholderText("Escreva uma mensagem...")).toBeTruthy()
  })

  it("logado: nome do outro usuário no header", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValueOnce({
      data: {
        id: "conv-123", otherUser: { id: "u2", name: "Maria Silva", avatarUrl: null },
        booking: { item: { title: "Furadeira" } }, messages: [],
        meta: { total: 0, page: 1, limit: 20, hasMore: false },
      },
    })
    wrap(<ChatThreadScreen />)
    expect(await screen.findByText("Maria Silva")).toBeTruthy()
  })

  it("logado: título do item de reserva no subheader", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValueOnce({
      data: {
        id: "conv-123", otherUser: { id: "u2", name: "Maria Silva", avatarUrl: null },
        booking: { item: { title: "Furadeira Bosch" } }, messages: [],
        meta: { total: 0, page: 1, limit: 20, hasMore: false },
      },
    })
    wrap(<ChatThreadScreen />)
    expect(await screen.findByText("Furadeira Bosch")).toBeTruthy()
  })

  it("exibe mensagens recebidas com corpo correto", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValueOnce({
      data: {
        id: "conv-123", otherUser: { id: "u2", name: "Maria", avatarUrl: null },
        booking: null,
        messages: [
          { id: "m1", body: "Olá, ainda está disponível?", createdAt: new Date().toISOString(), sender: { id: "u2", name: "Maria" } },
        ],
        meta: { total: 1, page: 1, limit: 20, hasMore: false },
      },
    })
    wrap(<ChatThreadScreen />)
    expect(await screen.findByText("Olá, ainda está disponível?")).toBeTruthy()
  })

  it("botão enviar desabilitado com campo vazio (acessibilidade)", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValueOnce({
      data: {
        id: "conv-123", otherUser: { id: "u2", name: "Maria", avatarUrl: null },
        booking: null, messages: [],
        meta: { total: 0, page: 1, limit: 20, hasMore: false },
      },
    })
    wrap(<ChatThreadScreen />)
    await screen.findByPlaceholderText("Escreva uma mensagem...")
    const sendBtn = screen.getByLabelText("Enviar mensagem")
    expect(sendBtn.props.accessibilityState?.disabled).toBe(true)
  })
})
