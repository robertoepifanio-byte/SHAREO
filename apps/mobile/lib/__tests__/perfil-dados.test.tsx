// Testes RNTL — DadosScreen (apps/mobile/app/perfil/dados.tsx)
// Fonte verificada: app/perfil/dados/page.tsx
//
// Verifica:
//   - guard de não-autenticado
//   - rótulos verbatim do site-fonte (texto exato)
//   - os 4 itens de dados (CPF/CNPJ, locações, mensagens, localização)
//   - botão de exportação (idle, loading)
//   - navegação para KYC (documentos) e segurança

import React from "react"
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react-native"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { router } from "expo-router"

// ── Mock: react-native-safe-area-context ───────────────────────────────────────
// jest.setup.js não inclui este mock; o SafeAreaProvider real (nativo) não
// renderiza filhos no ambiente Jest sem o NativeModule correspondente.
jest.mock("react-native-safe-area-context", () => {
  const React = require("react")
  const { View } = require("react-native")
  return {
    SafeAreaProvider:  ({ children }: { children: React.ReactNode }) =>
      React.createElement(View, null, children),
    SafeAreaView:      ({ children }: { children: React.ReactNode }) =>
      React.createElement(View, null, children),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    useSafeAreaFrame:  () => ({ x: 0, y: 0, width: 375, height: 812 }),
  }
})

// ── Mocks de módulos nativos ──────────────────────────────────────────────────
// expo-file-system/legacy — subpath da v19 que preserva a API funcional anterior.
// expo-sharing — instalado via `npx expo install expo-sharing`.
// Ambos são módulos nativos; o comportamento real requer rebuild do dev-client.
// { virtual: true } garante que o mock funciona independente do estado de
// instalação dos pacotes no ambiente de CI/dev.

jest.mock("expo-file-system/legacy", () => ({
  documentDirectory:  "file:///mock/documents/",
  EncodingType:       { UTF8: "utf8" },
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
}), { virtual: true })

jest.mock("expo-sharing", () => ({
  shareAsync:       jest.fn().mockResolvedValue(undefined),
  isAvailableAsync: jest.fn().mockResolvedValue(true),
}), { virtual: true })

jest.mock("@/lib/api", () => ({
  apiFetch:  jest.fn(),
  API_URL:   "https://staging.shareo.com.br",
  getTokens: jest.fn().mockResolvedValue({ accessToken: "tok", refreshToken: "tok_r" }),
}))

// Nota: jest.mock é hoistado antes das declarações de variáveis, portanto
// a factory NÃO pode referenciar USER_LOGADO. O mock inicial registra uma
// função vazia — cada describe/beforeEach chama mockImplementation correta.
jest.mock("@/lib/auth", () => ({
  useAuth: jest.fn(),
}))

// { virtual: true } porque lib/theme.tsx só existe na branch (não no main repo
// da máquina usada para executar npx jest com node_modules instalados).
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
    bookingPending:   "#F59E0B",
    bookingActive:    "#007B3C",
    bookingCompleted: "#64748B",
    bookingCancelled: "#E74C3C",
    bookingDisputed:  "#C05800",
    disabledBg:     "#E2E8F0",
    disabledText:   "#94A3B8",
    disabledBorder: "#CBD5E1",
  }
  return {
    useTheme:      () => ({ preference: "light", mode: "light", tokens: LIGHT, setPreference: jest.fn() }),
    ThemeProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  }
}, { virtual: true })

// ── Importações pós-mock ───────────────────────────────────────────────────────
import DadosScreen from "@/app/perfil/dados"
import { useAuth } from "@/lib/auth"
import { apiFetch } from "@/lib/api"

// ── Dados de teste ────────────────────────────────────────────────────────────

const USER_LOGADO = {
  id:         "user-1",
  name:       "Fulano Silva",
  email:      "fulano@shareo.com.br",
  role:       "USER",
  avatarUrl:  null,
  isVerified: false,
}

const EXPORT_PAYLOAD = {
  exportedAt: "2026-07-04T00:00:00.000Z",
  perfil:     { name: "Fulano Silva", email: "fulano@shareo.com.br" },
}

// ── Utilitários ────────────────────────────────────────────────────────────────

function mockAuthLogado() {
  ;(useAuth as unknown as jest.Mock).mockImplementation((selector: (s: object) => unknown) =>
    selector({
      user:     USER_LOGADO,
      logout:   jest.fn(),
      loading:  false,
      loadUser: jest.fn(),
      login:    jest.fn(),
    })
  )
}

function mockAuthDeslogado() {
  ;(useAuth as unknown as jest.Mock).mockImplementation((selector: (s: object) => unknown) =>
    selector({
      user:     null,
      logout:   jest.fn(),
      loading:  false,
      loadUser: jest.fn(),
      login:    jest.fn(),
    })
  )
}

function wrap(ui: React.ReactElement) {
  return render(
    <SafeAreaProvider>
      {ui}
    </SafeAreaProvider>
  )
}

// ── Testes ────────────────────────────────────────────────────────────────────

describe("DadosScreen — não autenticado", () => {
  beforeEach(() => {
    mockAuthDeslogado()
    ;(apiFetch as jest.Mock).mockResolvedValue(EXPORT_PAYLOAD)
  })

  it("exibe mensagem de login e botão Entrar", () => {
    wrap(<DadosScreen />)
    expect(screen.getByText(/Faça login para acessar seus dados/i)).toBeTruthy()
    expect(screen.getByRole("button", { name: /Entrar/i })).toBeTruthy()
  })

  it("botão Entrar navega para login", () => {
    wrap(<DadosScreen />)
    fireEvent.press(screen.getByRole("button", { name: /Entrar/i }))
    expect(router.push).toHaveBeenCalledWith("/(auth)/login")
  })
})

describe("DadosScreen — autenticado", () => {
  beforeEach(() => {
    mockAuthLogado()
    ;(apiFetch as jest.Mock).mockResolvedValue(EXPORT_PAYLOAD)
    // Restaura mocks de FileSystem e Sharing (podem ser limpos por clearAllMocks)
    const FileSystem = require("expo-file-system/legacy")
    FileSystem.writeAsStringAsync.mockResolvedValue(undefined)
    const Sharing = require("expo-sharing")
    Sharing.shareAsync.mockResolvedValue(undefined)
  })

  // ── Estrutura da página ──────────────────────────────────────────────────────

  it("exibe título da tela verbatim — 'Privacidade e Dados'", () => {
    wrap(<DadosScreen />)
    expect(screen.getByText("Privacidade e Dados")).toBeTruthy()
  })

  it("exibe intro LGPD verbatim", () => {
    wrap(<DadosScreen />)
    expect(screen.getByText(/LGPD \(Lei 13\.709\/2018\)/i)).toBeTruthy()
  })

  // ── Card: Exportar meus dados ────────────────────────────────────────────────

  it("exibe título do card de exportação verbatim", () => {
    wrap(<DadosScreen />)
    expect(screen.getByText("Exportar meus dados")).toBeTruthy()
  })

  it("exibe descrição do card de exportação (LGPD art. 20)", () => {
    wrap(<DadosScreen />)
    expect(screen.getByText(/LGPD art\. 20/i)).toBeTruthy()
  })

  it("exibe botão 'Exportar dados (JSON)' acessível", () => {
    wrap(<DadosScreen />)
    expect(
      screen.getByRole("button", { name: /Exportar dados em formato JSON/i })
    ).toBeTruthy()
    expect(screen.getByText(/Exportar dados \(JSON\)/i)).toBeTruthy()
  })

  // ── Card: Sobre seus dados — 4 itens verbatim ─────────────────────────────────

  it("exibe título do card 'Sobre seus dados'", () => {
    wrap(<DadosScreen />)
    expect(screen.getByText("Sobre seus dados")).toBeTruthy()
  })

  it("exibe item CPF/CNPJ com descrição verbatim (AES-256-GCM)", () => {
    wrap(<DadosScreen />)
    expect(screen.getByText("CPF/CNPJ")).toBeTruthy()
    expect(screen.getByText(/AES-256-GCM/i)).toBeTruthy()
  })

  it("exibe item 'Histórico de locações' com obrigação fiscal", () => {
    wrap(<DadosScreen />)
    expect(screen.getByText("Histórico de locações")).toBeTruthy()
    expect(screen.getByText(/obrigação fiscal/i)).toBeTruthy()
  })

  it("exibe item 'Mensagens' com política de retenção", () => {
    wrap(<DadosScreen />)
    expect(screen.getByText("Mensagens")).toBeTruthy()
    expect(screen.getByText(/enquanto a conta estiver ativa/i)).toBeTruthy()
  })

  it("exibe item 'Localização' com política de não compartilhamento", () => {
    wrap(<DadosScreen />)
    expect(screen.getByText("Localização")).toBeTruthy()
    expect(screen.getByText(/nunca compartilhada com terceiros/i)).toBeTruthy()
  })

  // ── Card: Verificação de identidade ──────────────────────────────────────────

  it("exibe card de verificação de identidade com título verbatim", () => {
    wrap(<DadosScreen />)
    expect(screen.getByText("Verificação de identidade")).toBeTruthy()
  })

  it("exibe botão 'Ir para Documentos' acessível", () => {
    wrap(<DadosScreen />)
    expect(
      screen.getByRole("button", { name: /Ir para Documentos/i })
    ).toBeTruthy()
  })

  it("botão 'Ir para Documentos' navega para /kyc (rota nativa)", () => {
    wrap(<DadosScreen />)
    fireEvent.press(screen.getByRole("button", { name: /Ir para Documentos/i }))
    expect(router.push).toHaveBeenCalledWith("/kyc")
  })

  // ── Card: Excluir conta ───────────────────────────────────────────────────────

  it("exibe card de excluir conta com título verbatim", () => {
    wrap(<DadosScreen />)
    expect(screen.getByText("Excluir conta")).toBeTruthy()
  })

  it("exibe botão 'Ir para Segurança' acessível", () => {
    wrap(<DadosScreen />)
    expect(
      screen.getByRole("button", { name: /Ir para Segurança/i })
    ).toBeTruthy()
  })

  it("botão 'Ir para Segurança' navega para /perfil/seguranca (PR #198)", () => {
    wrap(<DadosScreen />)
    fireEvent.press(screen.getByRole("button", { name: /Ir para Segurança/i }))
    expect(router.push).toHaveBeenCalledWith("/perfil/seguranca")
  })

  // ── Funcionalidade de exportação ──────────────────────────────────────────────

  it("exportar: chama apiFetch, FileSystem.writeAsStringAsync e Sharing.shareAsync", async () => {
    const FileSystem = require("expo-file-system/legacy")
    const Sharing    = require("expo-sharing")

    wrap(<DadosScreen />)
    const exportBtn = screen.getByRole("button", { name: /Exportar dados em formato JSON/i })

    await act(async () => {
      fireEvent.press(exportBtn)
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith("/api/users/me/export")
      expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith(
        expect.stringContaining("shareo-meus-dados-"),
        expect.any(String),
        { encoding: "utf8" },
      )
      expect(Sharing.shareAsync).toHaveBeenCalledWith(
        expect.stringContaining("shareo-meus-dados-"),
        expect.objectContaining({ mimeType: "application/json" }),
      )
    })
  })

  it("exportar: nome do arquivo inclui data do dia no formato YYYY-MM-DD", async () => {
    const FileSystem = require("expo-file-system/legacy")

    wrap(<DadosScreen />)

    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: /Exportar dados em formato JSON/i }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    await waitFor(() => {
      const calls = FileSystem.writeAsStringAsync.mock.calls
      expect(calls.length).toBeGreaterThan(0)
      const fileUri = calls[0][0] as string
      expect(fileUri).toMatch(/shareo-meus-dados-\d{4}-\d{2}-\d{2}\.json$/)
    })
  })

  it("exportar: botão fica desabilitado durante loading (testID + accessibilityState)", async () => {
    ;(apiFetch as jest.Mock).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(EXPORT_PAYLOAD), 200))
    )

    wrap(<DadosScreen />)
    const exportBtn = screen.getByRole("button", { name: /Exportar dados em formato JSON/i })

    act(() => { fireEvent.press(exportBtn) })

    // Verificar spinner E disabled dentro do mesmo waitFor para garantir
    // que o estado de loading ainda está ativo no momento da asserção.
    await waitFor(() => {
      expect(screen.getByTestId("export-loading")).toBeTruthy()
      const btn = screen.getByTestId("btn-exportar")
      expect(btn.props.accessibilityState?.disabled).toBe(true)
    })
  })

  // ── Botão Voltar ─────────────────────────────────────────────────────────────

  it("botão Voltar chama router.back()", () => {
    wrap(<DadosScreen />)
    fireEvent.press(screen.getByRole("button", { name: /Voltar/i }))
    expect(router.back).toHaveBeenCalled()
  })
})
