// Testes das novas telas do Lote 2.
// Verifica rótulos exatos (transcrição literal da spec) nos estados principais.
// Fonte: docs/design/mobile-app-handoff.md + spec do Lote 2.
//
// NOTA: imports são estáticos (não dynamic) porque jest+babel não suporta
// await import() sem --experimental-vm-modules. Cada describe usa o componente
// importado diretamente no topo do arquivo.

import React from "react"
import { render, screen } from "@testing-library/react-native"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { SafeAreaProvider } from "react-native-safe-area-context"

// Importações estáticas das telas (Babel transpila corretamente)
import HomeScreen from "@/app/(tabs)/index"
import ChatScreen from "@/app/(tabs)/chat"
import ReservasScreen from "@/app/(tabs)/reservas"

// ── Mocks de dependências de tela ──────────────────────────────────────────────
jest.mock("@/lib/api", () => ({
  apiFetch: jest.fn().mockResolvedValue({ data: [], meta: { total: 0 } }),
  API_URL:  "https://staging.shareo.com.br",
  getTokens: jest.fn().mockResolvedValue(null),
}))

jest.mock("@/lib/auth", () => ({
  useAuth: jest.fn((selector) => selector({ user: null, logout: jest.fn(), loading: false })),
}))

// ThemeProvider precisa do AsyncStorage (já mockado no setup.js)
// mas precisamos que o ThemeProvider retorne imediatamente em testes.
jest.mock("@/lib/theme", () => {
  const React = require("react")
  const LIGHT = {
    bg: "#F8FAFC", surface: "#FFFFFF", text: "#0F172A", muted: "#64748B",
    border: "#E2E8F0", navy: "#003366", green: "#007B3C", error: "#C0392B",
  }
  return {
    useTheme: () => ({ preference: "light", mode: "light", tokens: LIGHT, setPreference: jest.fn() }),
    ThemeProvider: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
  }
})

// Avatar já mockado via expo-image no setup.js
jest.mock("@/components/ui/Avatar", () => {
  const React = require("react")
  const { View, Text } = require("react-native")
  return {
    Avatar: ({ name }: { name: string }) =>
      React.createElement(View, { testID: "avatar" },
        React.createElement(Text, null, name?.[0]?.toUpperCase() ?? "?")
      ),
  }
})

// ── Utilitários ────────────────────────────────────────────────────────────────
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

// ── Testes da tela Home (landing da campanha transcrita, 22/09/2026) ──────────
// A home deixou de ser a tela de marketplace (busca, CTAs de anunciar/alugar
// direto) — virou a landing de pré-lançamento transcrita de
// components/home/landing/*, com todo CTA levando pra /(auth)/register.
describe("HomeScreen (landing transcrita)", () => {
  it("exibe H1 verbatim do site — 'Tem algo parado?'", () => {
    wrap(<HomeScreen />)
    expect(screen.getByText(/Tem algo parado\?/)).toBeTruthy()
  })

  it("exibe 'Faça isso virar dinheiro.' (texto accent do H1)", () => {
    wrap(<HomeScreen />)
    expect(screen.getByText(/Faça isso virar dinheiro\./)).toBeTruthy()
  })

  it("exibe o CTA principal 'Quero ser um dos primeiros'", () => {
    wrap(<HomeScreen />)
    expect(screen.getByLabelText("Quero ser um dos primeiros")).toBeTruthy()
  })

  it("exibe a seção 'Você está de qual lado?'", () => {
    wrap(<HomeScreen />)
    expect(screen.getByText("Você está de qual lado?")).toBeTruthy()
  })

  it("exibe a seção 'Perguntas frequentes'", () => {
    wrap(<HomeScreen />)
    expect(screen.getByText("Perguntas frequentes")).toBeTruthy()
  })
})

// ── Testes da tela Chat (lista de conversas) ───────────────────────────────────
describe("ChatScreen (lista de conversas)", () => {
  it("não logado: exibe mensagem de login", () => {
    wrap(<ChatScreen />)
    expect(screen.getByText("Faça login para ver suas mensagens")).toBeTruthy()
  })

  it("logado sem conversas: exibe empty state — 'Nenhuma conversa ainda' (verbatim spec Lote 2)", async () => {
    const { useAuth } = require("@/lib/auth")
    useAuth.mockImplementation((sel: (s: object) => unknown) =>
      sel({ user: { id: "1", name: "Teste", email: "t@t.com", role: "USER", avatarUrl: null, isVerified: false }, logout: jest.fn(), loading: false })
    )
    wrap(<ChatScreen />)
    // Aguarda resolução da query (mock retorna [] imediatamente)
    expect(await screen.findByText("Nenhuma conversa ainda")).toBeTruthy()
  })

  it("logado sem conversas: exibe descrição verbatim da spec Lote 2", async () => {
    const { useAuth } = require("@/lib/auth")
    useAuth.mockImplementation((sel: (s: object) => unknown) =>
      sel({ user: { id: "1", name: "Teste", email: "t@t.com", role: "USER", avatarUrl: null, isVerified: false }, logout: jest.fn(), loading: false })
    )
    wrap(<ChatScreen />)
    expect(await screen.findByText("Quando você solicitar ou receber uma reserva, a conversa aparecerá aqui.")).toBeTruthy()
  })

  it("logado sem conversas: NÃO exibe botão (spec: sem botão no empty state)", async () => {
    const { useAuth } = require("@/lib/auth")
    useAuth.mockImplementation((sel: (s: object) => unknown) =>
      sel({ user: { id: "1", name: "Teste", email: "t@t.com", role: "USER", avatarUrl: null, isVerified: false }, logout: jest.fn(), loading: false })
    )
    wrap(<ChatScreen />)
    await screen.findByText("Nenhuma conversa ainda")
    // Não deve ter botão de ação no empty state de chat
    expect(screen.queryByRole("button")).toBeNull()
  })
})

// ── Testes da tela Reservas ────────────────────────────────────────────────────
describe("ReservasScreen", () => {
  it("não logado: exibe mensagem de login", () => {
    const { useAuth } = require("@/lib/auth")
    useAuth.mockImplementation((sel: (s: object) => unknown) =>
      sel({ user: null, logout: jest.fn(), loading: false })
    )
    wrap(<ReservasScreen />)
    expect(screen.getByText("Faça login para ver suas reservas")).toBeTruthy()
  })

  it("logado sem reservas: empty state — 'Nenhuma reserva ainda' (verbatim spec Lote 2)", async () => {
    const { useAuth } = require("@/lib/auth")
    useAuth.mockImplementation((sel: (s: object) => unknown) =>
      sel({ user: { id: "1", name: "Teste", email: "t@t.com", role: "USER", avatarUrl: null, isVerified: false }, logout: jest.fn(), loading: false })
    )
    wrap(<ReservasScreen />)
    expect(await screen.findByText("Nenhuma reserva ainda")).toBeTruthy()
  })

  it("logado sem reservas: 'Explore itens disponíveis e faça sua primeira reserva.' (verbatim)", async () => {
    const { useAuth } = require("@/lib/auth")
    useAuth.mockImplementation((sel: (s: object) => unknown) =>
      sel({ user: { id: "1", name: "Teste", email: "t@t.com", role: "USER", avatarUrl: null, isVerified: false }, logout: jest.fn(), loading: false })
    )
    wrap(<ReservasScreen />)
    expect(await screen.findByText("Explore itens disponíveis e faça sua primeira reserva.")).toBeTruthy()
  })

  it("logado sem reservas: link 'Explorar anúncios →' (verbatim spec Lote 2)", async () => {
    const { useAuth } = require("@/lib/auth")
    useAuth.mockImplementation((sel: (s: object) => unknown) =>
      sel({ user: { id: "1", name: "Teste", email: "t@t.com", role: "USER", avatarUrl: null, isVerified: false }, logout: jest.fn(), loading: false })
    )
    wrap(<ReservasScreen />)
    expect(await screen.findByText("Explorar anúncios →")).toBeTruthy()
  })
})
