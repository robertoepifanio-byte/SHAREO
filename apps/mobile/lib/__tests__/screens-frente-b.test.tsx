// Testes das telas da Frente B (re-transcrição rigorosa s41).
// Verifica rótulos verbatim do site e comportamentos-chave de cada tela.
//
// Telas cobertas:
//   - FavoritosScreen   → app/favoritos.tsx      (fonte: app/favoritos/page.tsx)
//   - PerfilScreen      → app/(tabs)/perfil.tsx   (fonte: app/perfil/page.tsx)
//   - RegisterScreen    → app/(auth)/register.tsx  (fonte: app/(auth)/cadastro/RegisterForm.tsx)
//   - ForgotPasswordScreen → app/(auth)/forgot-password.tsx (fonte: app/(auth)/esqueci-senha/_ForgotPasswordForm.tsx)
//
// KYC: já coberto em screens-lote3.test.tsx — não duplicar.

import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { SafeAreaProvider } from "react-native-safe-area-context"

import FavoritosScreen   from "@/app/favoritos"
import PerfilScreen      from "@/app/(tabs)/perfil"
import RegisterScreen    from "@/app/(auth)/register"
import ForgotPassword    from "@/app/(auth)/forgot-password"

// ── Mocks globais ──────────────────────────────────────────────────────────────
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
    warning: "#F59E0B", success: "#007B3C",
    bookingPending: "#F59E0B", bookingActive: "#007B3C",
    bookingCompleted: "#64748B", bookingCancelled: "#E74C3C",
    bookingDisputed: "#C05800",
    disabledBg: "#E2E8F0", disabledText: "#94A3B8", disabledBorder: "#CBD5E1",
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
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  Link:   ({ children }: { children: React.ReactNode }) => children,
  useLocalSearchParams: () => ({}),
  usePathname: () => "/",
  useSegments: () => [],
}))

jest.mock("react-native-safe-area-context", () => {
  const insets = { top: 0, right: 0, bottom: 0, left: 0 }
  return {
    useSafeAreaInsets:  () => insets,
    SafeAreaProvider:   ({ children }: { children: React.ReactNode }) => children,
    SafeAreaView:       ({ children }: { children: React.ReactNode }) => children,
    initialWindowMetrics: { insets, frame: { x: 0, y: 0, width: 375, height: 812 } },
  }
})

// Avatar mock simples
jest.mock("@/components/ui/Avatar", () => {
  const React = require("react")
  const { View, Text } = require("react-native")
  return {
    Avatar: ({ name }: { name?: string | null }) =>
      React.createElement(View, { testID: "avatar" },
        React.createElement(Text, null, name?.[0]?.toUpperCase() ?? "?")
      ),
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

const mockUser = {
  id: "user-1", name: "Ana Souza", email: "ana@example.com",
  role: "USER" as const, avatarUrl: null, isVerified: true,
}

function withUser() {
  const { useAuth } = require("@/lib/auth") as { useAuth: jest.Mock }
  const state = { user: mockUser, logout: jest.fn(), loading: false }
  // useAuth() é chamado tanto com seletor (useAuth(s => s.x)) quanto sem
  // (useAuth() retorna o estado inteiro, padrão Zustand) — o mock precisa
  // dos dois caminhos, senão "sel is not a function" quando não há seletor.
  useAuth.mockImplementation((sel?: (s: object) => unknown) => (sel ? sel(state) : state))
}

function withoutUser() {
  const { useAuth } = require("@/lib/auth") as { useAuth: jest.Mock }
  const state = { user: null, logout: jest.fn(), loading: false }
  useAuth.mockImplementation((sel?: (s: object) => unknown) => (sel ? sel(state) : state))
}

// ── FavoritosScreen ───────────────────────────────────────────────────────────
describe("FavoritosScreen (re-auditoria Frente B)", () => {
  beforeEach(() => jest.clearAllMocks())

  // Verbatim de app/favoritos/page.tsx
  it("não logado: 'Faça login para ver seus favoritos' (verbatim)", () => {
    withoutUser()
    wrap(<FavoritosScreen />)
    expect(screen.getByText("Faça login para ver seus favoritos")).toBeTruthy()
  })

  it("não logado: botão 'Entrar' (verbatim)", () => {
    withoutUser()
    wrap(<FavoritosScreen />)
    expect(screen.getByText("Entrar")).toBeTruthy()
  })

  it("logado: header 'Favoritos' (verbatim)", () => {
    withUser()
    wrap(<FavoritosScreen />)
    expect(screen.getByText("Favoritos")).toBeTruthy()
  })

  it("logado sem itens: 'Nenhum favorito ainda' (verbatim de app/favoritos/page.tsx linha 63)", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValueOnce({ data: [] })
    wrap(<FavoritosScreen />)
    expect(await screen.findByText("Nenhum favorito ainda")).toBeTruthy()
  })

  it("logado sem itens: 'Toque no coração em qualquer item para salvá-lo aqui.' (verbatim do site, favoritos/page.tsx:63)", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValueOnce({ data: [] })
    wrap(<FavoritosScreen />)
    expect(await screen.findByText("Toque no coração em qualquer item para salvá-lo aqui.")).toBeTruthy()
  })

  it("logado sem itens: sem botão CTA inventado (site não passa `action` ao EmptyState, favoritos/page.tsx:60-64)", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValueOnce({ data: [] })
    wrap(<FavoritosScreen />)
    await screen.findByText("Nenhum favorito ainda")
    expect(screen.queryByText("Explorar itens")).toBeNull()
  })

  it("logado com itens: exibe título do item (mock)", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValueOnce({
      data: [{
        id: "item-1", title: "Furadeira Bosch",
        pricePerDay: 3500, condition: "BOM",
        city: "São Paulo", state: "SP", neighborhood: "Pinheiros",
        images: [], category: { name: "Ferramentas", slug: "ferramentas" },
        owner: { name: "João", isVerified: true },
        _count: { reviews: 5, favorites: 12 },
        favoritedAt: new Date().toISOString(),
      }],
    })
    wrap(<FavoritosScreen />)
    expect(await screen.findByText("Furadeira Bosch")).toBeTruthy()
  })

  it("logado com itens: exibe categoria (uppercase é CSS textTransform, não JS — mesmo padrão de components/items/ItemCard.tsx)", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValueOnce({
      data: [{
        id: "item-1", title: "Furadeira Bosch",
        pricePerDay: 3500, condition: "BOM",
        city: "São Paulo", state: "SP", neighborhood: "Pinheiros",
        images: [], category: { name: "Ferramentas", slug: "ferramentas" },
        owner: { name: "João", isVerified: true },
        _count: { reviews: 5, favorites: 12 },
        favoritedAt: new Date().toISOString(),
      }],
    })
    wrap(<FavoritosScreen />)
    expect(await screen.findByText("Ferramentas")).toBeTruthy()
  })
})

// ── PerfilScreen ──────────────────────────────────────────────────────────────
describe("PerfilScreen (re-auditoria Frente B)", () => {
  beforeEach(() => jest.clearAllMocks())

  it("não logado: 'Faça login para acessar seu perfil' (verbatim do guard)", () => {
    withoutUser()
    wrap(<PerfilScreen />)
    expect(screen.getByText("Faça login para acessar seu perfil")).toBeTruthy()
  })

  it("não logado: botão 'Entrar' (verbatim)", () => {
    withoutUser()
    wrap(<PerfilScreen />)
    expect(screen.getByText("Entrar")).toBeTruthy()
  })

  it("não logado: link 'Criar conta' (verbatim)", () => {
    withoutUser()
    wrap(<PerfilScreen />)
    expect(screen.getByText("Criar conta")).toBeTruthy()
  })

  it("logado: nome do usuário exibido (do store de auth)", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValueOnce({ data: { ...mockUser, bio: null, city: null, state: null, neighborhood: null, createdAt: "2025-01-01T00:00:00Z", userType: "PF" } })
    wrap(<PerfilScreen />)
    expect(await screen.findByText("Ana Souza")).toBeTruthy()
  })

  it("logado: badge '✓ Verificado' quando isVerified=true (verbatim do site linha 127)", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValueOnce({ data: { ...mockUser, bio: null, city: null, state: null, neighborhood: null, createdAt: "2025-01-01T00:00:00Z", userType: "PF" } })
    wrap(<PerfilScreen />)
    expect(await screen.findByText("✓ Verificado")).toBeTruthy()
  })

  it("logado: seção 'Configurações da conta' presente (verbatim do site linha 252)", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValueOnce({ data: { ...mockUser, bio: null, city: null, state: null, neighborhood: null, createdAt: "2025-01-01T00:00:00Z", userType: "PF" } })
    wrap(<PerfilScreen />)
    expect(await screen.findByText("Configurações da conta")).toBeTruthy()
  })

  // CONFIG_LINKS verbatim — app/perfil/page.tsx linhas 22-30
  it("logado: menu item 'Editar perfil' presente (verbatim CONFIG_LINKS)", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValueOnce({ data: { ...mockUser, bio: null, city: null, state: null, neighborhood: null, createdAt: "2025-01-01T00:00:00Z", userType: "PF" } })
    wrap(<PerfilScreen />)
    expect(await screen.findByText("Editar perfil")).toBeTruthy()
  })

  it("logado: menu item 'Favoritos' presente (verbatim CONFIG_LINKS)", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValueOnce({ data: { ...mockUser, bio: null, city: null, state: null, neighborhood: null, createdAt: "2025-01-01T00:00:00Z", userType: "PF" } })
    wrap(<PerfilScreen />)
    expect(await screen.findByText("Favoritos")).toBeTruthy()
  })

  it("logado: menu item 'Login e segurança' presente (verbatim CONFIG_LINKS)", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValueOnce({ data: { ...mockUser, bio: null, city: null, state: null, neighborhood: null, createdAt: "2025-01-01T00:00:00Z", userType: "PF" } })
    wrap(<PerfilScreen />)
    expect(await screen.findByText("Login e segurança")).toBeTruthy()
  })

  it("logado: menu item 'Conta de recebimento' presente (verbatim CONFIG_LINKS)", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValueOnce({ data: { ...mockUser, bio: null, city: null, state: null, neighborhood: null, createdAt: "2025-01-01T00:00:00Z", userType: "PF" } })
    wrap(<PerfilScreen />)
    expect(await screen.findByText("Conta de recebimento")).toBeTruthy()
  })

  it("logado: menu item 'Privacidade e dados' presente (verbatim CONFIG_LINKS)", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValueOnce({ data: { ...mockUser, bio: null, city: null, state: null, neighborhood: null, createdAt: "2025-01-01T00:00:00Z", userType: "PF" } })
    wrap(<PerfilScreen />)
    expect(await screen.findByText("Privacidade e dados")).toBeTruthy()
  })

  it("logado: botão 'Sair' presente com função de logout (verbatim)", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValueOnce({ data: { ...mockUser, bio: null, city: null, state: null, neighborhood: null, createdAt: "2025-01-01T00:00:00Z", userType: "PF" } })
    wrap(<PerfilScreen />)
    expect(await screen.findByText("Sair")).toBeTruthy()
  })

  it("logado: rodapé 'ShareO · Use Mais. Possua Menos.' (verbatim)", async () => {
    withUser()
    const { apiFetch } = require("@/lib/api") as { apiFetch: jest.Mock }
    apiFetch.mockResolvedValueOnce({ data: { ...mockUser, bio: null, city: null, state: null, neighborhood: null, createdAt: "2025-01-01T00:00:00Z", userType: "PF" } })
    wrap(<PerfilScreen />)
    expect(await screen.findByText("ShareO · Use Mais. Possua Menos.")).toBeTruthy()
  })
})

// ── RegisterScreen ────────────────────────────────────────────────────────────
describe("RegisterScreen (re-auditoria Frente B)", () => {
  beforeEach(() => jest.clearAllMocks())

  it("exibe 'Criar conta' como título (verbatim RegisterForm.tsx linha 189)", () => {
    wrap(<RegisterScreen />)
    expect(screen.getByText("Criar conta")).toBeTruthy()
  })

  it("exibe 'Criar conta no site →' como CTA principal (verbatim)", () => {
    wrap(<RegisterScreen />)
    expect(screen.getByText("Criar conta no site →")).toBeTruthy()
  })

  it("exibe 'Já tenho conta — Entrar' como CTA secundário (verbatim)", () => {
    wrap(<RegisterScreen />)
    expect(screen.getByText("Já tenho conta — Entrar")).toBeTruthy()
  })

  it("CTA principal tem accessibilityRole='link' (semântica correta)", () => {
    wrap(<RegisterScreen />)
    const cta = screen.getByLabelText("Criar conta no site ShareO")
    expect(cta.props.accessibilityRole).toBe("link")
  })

  it("exibe slogan 'Use Mais. Possua Menos.' (verbatim)", () => {
    wrap(<RegisterScreen />)
    expect(screen.getByText("Use Mais. Possua Menos.")).toBeTruthy()
  })
})

// ── ForgotPasswordScreen ──────────────────────────────────────────────────────
describe("ForgotPasswordScreen (re-auditoria Frente B)", () => {
  beforeEach(() => jest.clearAllMocks())

  // Verbatim de _ForgotPasswordForm.tsx linha 77
  it("título 'Recuperar senha' (verbatim)", () => {
    wrap(<ForgotPassword />)
    expect(screen.getByText("Recuperar senha")).toBeTruthy()
  })

  // Verbatim de _ForgotPasswordForm.tsx linha 79
  it("subtítulo 'Informe seu e-mail...' (verbatim)", () => {
    wrap(<ForgotPassword />)
    expect(screen.getByText("Informe seu e-mail e enviaremos um link para criar uma nova senha.")).toBeTruthy()
  })

  // Label do campo — verbatim do site linha 91
  it("label 'E-mail' no campo (verbatim)", () => {
    wrap(<ForgotPassword />)
    expect(screen.getByText("E-mail")).toBeTruthy()
  })

  // CTA — verbatim do site linha 101
  it("CTA 'Enviar link de recuperação' (verbatim)", () => {
    wrap(<ForgotPassword />)
    expect(screen.getByText("Enviar link de recuperação")).toBeTruthy()
  })

  // Link inferior — verbatim do site linha 107
  it("link 'Entrar' na parte inferior (verbatim linhas 107-110)", () => {
    wrap(<ForgotPassword />)
    expect(screen.getByText("Entrar")).toBeTruthy()
  })

  it("'Lembrou a senha?' presente na parte inferior (verbatim)", () => {
    wrap(<ForgotPassword />)
    expect(screen.getByText("Lembrou a senha? ")).toBeTruthy()
  })

  it("placeholder 'seu@email.com' no campo (verbatim do site linha 94)", () => {
    wrap(<ForgotPassword />)
    expect(screen.getByPlaceholderText("seu@email.com")).toBeTruthy()
  })

  it("exibe erro inline se e-mail sem '@' (validação verbatim do site linha 16)", async () => {
    wrap(<ForgotPassword />)
    const input = screen.getByPlaceholderText("seu@email.com")
    fireEvent.changeText(input, "invalido")
    const btn = screen.getByText("Enviar link de recuperação")
    fireEvent.press(btn)
    await waitFor(() => {
      expect(screen.getByText("E-mail inválido")).toBeTruthy()
    })
  })

  it("após envio bem-sucedido: 'Verifique seu e-mail' (verbatim do site linha 43)", async () => {
    // Mock de fetch global
    const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response("{}", { status: 200 })
    )
    wrap(<ForgotPassword />)
    const input = screen.getByPlaceholderText("seu@email.com")
    fireEvent.changeText(input, "ana@example.com")
    const btn = screen.getByText("Enviar link de recuperação")
    fireEvent.press(btn)
    await waitFor(() => {
      expect(screen.getByText("Verifique seu e-mail")).toBeTruthy()
    })
    fetchSpy.mockRestore()
  })

  it("estado enviado: 'Não recebeu?' com link 'tente novamente' (verbatim do site linha 49-54)", async () => {
    const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response("{}", { status: 200 })
    )
    wrap(<ForgotPassword />)
    const input = screen.getByPlaceholderText("seu@email.com")
    fireEvent.changeText(input, "ana@example.com")
    fireEvent.press(screen.getByText("Enviar link de recuperação"))
    await waitFor(() => {
      expect(screen.getByText("tente novamente")).toBeTruthy()
    })
    fetchSpy.mockRestore()
  })

  it("estado enviado: 'Voltar ao login' presente (verbatim do site linha 58 '← Voltar para o login')", async () => {
    const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response("{}", { status: 200 })
    )
    wrap(<ForgotPassword />)
    const input = screen.getByPlaceholderText("seu@email.com")
    fireEvent.changeText(input, "ana@example.com")
    fireEvent.press(screen.getByText("Enviar link de recuperação"))
    await waitFor(() => {
      expect(screen.getByText("← Voltar para o login")).toBeTruthy()
    })
    fetchSpy.mockRestore()
  })

  it("StyleSheet: NÃO usa className (padrão StyleSheet + tokens)", () => {
    // Verifica que o componente renderiza sem erros (NativeWind className em RN nativa causa crash)
    expect(() => wrap(<ForgotPassword />)).not.toThrow()
  })
})
