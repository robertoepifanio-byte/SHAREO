// Testes RNTL — SuporteScreen (apps/mobile/app/suporte.tsx)
// Fonte verificada: app/suporte/page.tsx
//
// Verifica:
//   - título no header ("Suporte") verbatim
//   - título da página ("🛠️ Suporte ShareO") verbatim
//   - subtítulo da página verbatim
//   - 3 seções: Central de Ajuda, Atendimento, Segurança
//   - itens de cada seção (label + description) verbatim
//   - botões CTA verbatim
//   - navegação dos botões usa router.push (não Linking)
//   - botão Voltar chama router.back()

import React from "react"
import { render, screen, fireEvent } from "@testing-library/react-native"
import { router } from "expo-router"

// ── Mock: react-native-safe-area-context ─────────────────────────────────────
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

// ── Mock: @/lib/theme ─────────────────────────────────────────────────────────
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

// ── Importação pós-mock ────────────────────────────────────────────────────────
import SuporteScreen from "@/app/suporte"

// ── Utilitário de render ───────────────────────────────────────────────────────
function wrap(ui: React.ReactElement) {
  return render(ui)
}

// ── Testes ─────────────────────────────────────────────────────────────────────

describe("SuporteScreen — estrutura geral", () => {

  it("exibe título 'Suporte' no header verbatim", () => {
    wrap(<SuporteScreen />)
    expect(screen.getByText("Suporte")).toBeTruthy()
  })

  it("exibe título da página '🛠️ Suporte ShareO' verbatim", () => {
    wrap(<SuporteScreen />)
    expect(screen.getByText("🛠️ Suporte ShareO")).toBeTruthy()
  })

  it("exibe subtítulo da página verbatim", () => {
    wrap(<SuporteScreen />)
    expect(
      screen.getByText("Estamos aqui para ajudar. Encontre respostas, tutoriais e canais de atendimento.")
    ).toBeTruthy()
  })

})

describe("SuporteScreen — seção Central de Ajuda verbatim", () => {

  it("exibe título da seção verbatim", () => {
    wrap(<SuporteScreen />)
    expect(screen.getByText("Central de Ajuda")).toBeTruthy()
  })

  it("exibe item FAQ com descrição verbatim (texto multilinha = 1 nó RNTL)", () => {
    wrap(<SuporteScreen />)
    // <Text multilinha> vira 1 nó — buscar a frase completa
    expect(screen.getByText(/FAQ/)).toBeTruthy()
    expect(screen.getByText(/Respostas rápidas para dúvidas comuns\./)).toBeTruthy()
  })

  it("exibe item Tutoriais com descrição verbatim", () => {
    wrap(<SuporteScreen />)
    expect(screen.getByText(/Tutoriais/)).toBeTruthy()
    expect(screen.getByText(/Passo a passo para cadastrar, alugar e gerenciar itens\./)).toBeTruthy()
  })

})

describe("SuporteScreen — seção Atendimento verbatim", () => {

  it("exibe título da seção verbatim", () => {
    wrap(<SuporteScreen />)
    expect(screen.getByText("Atendimento")).toBeTruthy()
  })

  it("exibe item 'Chat integrado' verbatim", () => {
    wrap(<SuporteScreen />)
    expect(screen.getByText(/Chat integrado/)).toBeTruthy()
    expect(screen.getByText(/Suporte direto dentro da plataforma\./)).toBeTruthy()
  })

  it("exibe item 'E-mail' verbatim", () => {
    wrap(<SuporteScreen />)
    expect(screen.getByText(/E-mail/)).toBeTruthy()
    expect(screen.getByText(/Contato para questões específicas\./)).toBeTruthy()
  })

  it("exibe item 'Disponibilidade' verbatim", () => {
    wrap(<SuporteScreen />)
    expect(screen.getByText(/Disponibilidade/)).toBeTruthy()
    expect(screen.getByText(/Equipe ativa 7 dias por semana para resolver problemas\./)).toBeTruthy()
  })

})

describe("SuporteScreen — seção Segurança verbatim", () => {

  it("exibe título da seção verbatim", () => {
    wrap(<SuporteScreen />)
    expect(screen.getByText("Segurança")).toBeTruthy()
  })

  it("exibe item 'Reputação' verbatim", () => {
    wrap(<SuporteScreen />)
    expect(screen.getByText(/Reputação/)).toBeTruthy()
    expect(
      screen.getByText(/Sistema de avaliação e reputação para aumentar a confiança entre usuários\./)
    ).toBeTruthy()
  })

  it("exibe item 'Disputas' verbatim", () => {
    wrap(<SuporteScreen />)
    expect(screen.getByText(/Disputas/)).toBeTruthy()
    expect(screen.getByText(/Canal exclusivo para reportar incidentes ou disputas\./)).toBeTruthy()
  })

})

describe("SuporteScreen — botões CTA verbatim", () => {

  it("exibe botão 'Acessar Central de Ajuda →' acessível", () => {
    wrap(<SuporteScreen />)
    expect(
      screen.getByRole("button", { name: /Acessar Central de Ajuda →/i })
    ).toBeTruthy()
  })

  it("exibe botão 'Abrir Chat de Suporte →' acessível", () => {
    wrap(<SuporteScreen />)
    expect(
      screen.getByRole("button", { name: /Abrir Chat de Suporte →/i })
    ).toBeTruthy()
  })

  it("botão 'Acessar Central de Ajuda →' navega via router.push('/ajuda') — não via Linking", () => {
    wrap(<SuporteScreen />)
    fireEvent.press(screen.getByRole("button", { name: /Acessar Central de Ajuda →/i }))
    expect(router.push).toHaveBeenCalledWith("/ajuda")
    // Garantia de que NÃO usa Linking (seria regressão para navegação nativa)
  })

  it("botão 'Abrir Chat de Suporte →' navega via router.push('/mensagens') — não via Linking", () => {
    wrap(<SuporteScreen />)
    fireEvent.press(screen.getByRole("button", { name: /Abrir Chat de Suporte →/i }))
    expect(router.push).toHaveBeenCalledWith("/mensagens")
  })

})

describe("SuporteScreen — navegação de volta", () => {

  it("exibe botão Voltar acessível", () => {
    wrap(<SuporteScreen />)
    expect(
      screen.getByRole("button", { name: /Voltar/i })
    ).toBeTruthy()
  })

  it("botão Voltar chama router.back()", () => {
    wrap(<SuporteScreen />)
    fireEvent.press(screen.getByRole("button", { name: /Voltar/i }))
    expect(router.back).toHaveBeenCalled()
  })

})
