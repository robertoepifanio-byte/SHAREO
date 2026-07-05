// Testes RNTL — SobreScreen (apps/mobile/app/sobre.tsx)
// Fonte verificada: app/sobre/page.tsx
//
// Verifica:
//   - título da página verbatim no header ("Sobre o ShareO")
//   - presença das 4 seções (Missão, História, Valores, Equipe)
//   - títulos dos 4 valores verbatim (Sustentabilidade, Comunidade, Segurança, Acessibilidade)
//   - stats verbatim (2.400+, R$2.000, 2026)
//   - seção Equipe com os 4 cards verbatim
//   - CTA com título e botões verbatim
//   - navegação de volta (router.back)
//   - navegação dos botões CTA

import React from "react"
import { render, screen, fireEvent } from "@testing-library/react-native"
import { router } from "expo-router"

// ── Mock: react-native-safe-area-context (TypeScript-typed) ──────────────────
// jest.setup.js já inclui este mock em JS puro; re-mockamos aqui com types
// corretos para evitar erros de inferência no ambiente TypeScript.
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

// ── Mock: @/lib/theme — { virtual: true } porque o arquivo só existe na branch
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
import SobreScreen from "@/app/sobre"

// ── Utilitário de render ───────────────────────────────────────────────────────
function wrap(ui: React.ReactElement) {
  return render(ui)
}

// ── Testes ─────────────────────────────────────────────────────────────────────

describe("SobreScreen — estrutura geral", () => {

  it("exibe título no header verbatim — 'Sobre o ShareO'", () => {
    wrap(<SobreScreen />)
    // O título "Sobre o ShareO" aparece tanto no header quanto no hero;
    // getByText confirma presença na árvore de componentes.
    expect(screen.getAllByText("Sobre o ShareO").length).toBeGreaterThanOrEqual(1)
  })

  it("exibe slogan verbatim no hero — 'Use Mais. Possua Menos.'", () => {
    wrap(<SobreScreen />)
    expect(screen.getByText("Use Mais. Possua Menos.")).toBeTruthy()
  })

  it("exibe subtítulo do hero verbatim", () => {
    wrap(<SobreScreen />)
    expect(screen.getByText(/conecta pessoas que querem gerar renda/i)).toBeTruthy()
  })

})

describe("SobreScreen — stats verbatim", () => {

  it("exibe stat '2.400+'", () => {
    wrap(<SobreScreen />)
    expect(screen.getByText("2.400+")).toBeTruthy()
  })

  it("exibe label 'itens cadastrados'", () => {
    wrap(<SobreScreen />)
    expect(screen.getByText("itens cadastrados")).toBeTruthy()
  })

  it("exibe stat 'R$2.000'", () => {
    wrap(<SobreScreen />)
    expect(screen.getByText("R$2.000")).toBeTruthy()
  })

  it("exibe label 'renda média/mês por proprietário'", () => {
    wrap(<SobreScreen />)
    expect(screen.getByText("renda média/mês por proprietário")).toBeTruthy()
  })

  it("exibe stat '2026'", () => {
    wrap(<SobreScreen />)
    expect(screen.getByText("2026")).toBeTruthy()
  })

  it("exibe label 'ano de fundação'", () => {
    wrap(<SobreScreen />)
    expect(screen.getByText("ano de fundação")).toBeTruthy()
  })

})

describe("SobreScreen — seção Missão verbatim", () => {

  it("exibe título da seção Missão", () => {
    wrap(<SobreScreen />)
    expect(screen.getByText("Missão")).toBeTruthy()
  })

  it("exibe citação verbatim", () => {
    wrap(<SobreScreen />)
    expect(
      screen.getByText(/"Transformar o que está parado em oportunidade de renda\."/i)
    ).toBeTruthy()
  })

  it("exibe parágrafo da missão com 'monetizar bens'", () => {
    wrap(<SobreScreen />)
    expect(screen.getByText(/monetizar bens que já possuem/i)).toBeTruthy()
  })

})

describe("SobreScreen — seção História verbatim", () => {

  it("exibe título da seção História", () => {
    wrap(<SobreScreen />)
    expect(screen.getByText("História")).toBeTruthy()
  })

  it("exibe parágrafo de origem verbatim ('surgiu em 2026')", () => {
    wrap(<SobreScreen />)
    expect(screen.getByText(/surgiu em 2026/i)).toBeTruthy()
  })

})

describe("SobreScreen — seção Valores verbatim (4 cards)", () => {

  it("exibe título da seção Valores", () => {
    wrap(<SobreScreen />)
    expect(screen.getByText("Valores")).toBeTruthy()
  })

  it("exibe card 'Sustentabilidade' com descrição verbatim", () => {
    wrap(<SobreScreen />)
    expect(screen.getByText("Sustentabilidade")).toBeTruthy()
    expect(
      screen.getByText("Reduzir consumo excessivo e prolongar a vida útil dos itens.")
    ).toBeTruthy()
  })

  it("exibe card 'Comunidade' com descrição verbatim", () => {
    wrap(<SobreScreen />)
    expect(screen.getByText("Comunidade")).toBeTruthy()
    expect(
      screen.getByText("Fortalecer laços locais e incentivar a colaboração entre vizinhos.")
    ).toBeTruthy()
  })

  it("exibe card 'Segurança' com descrição verbatim", () => {
    wrap(<SobreScreen />)
    expect(screen.getByText("Segurança")).toBeTruthy()
    expect(
      screen.getByText("Garantir transações protegidas e usuários verificados.")
    ).toBeTruthy()
  })

  it("exibe card 'Acessibilidade' com descrição verbatim", () => {
    wrap(<SobreScreen />)
    expect(screen.getByText("Acessibilidade")).toBeTruthy()
    expect(
      screen.getByText("Tornar o aluguel de itens simples e vantajoso para todos.")
    ).toBeTruthy()
  })

})

describe("SobreScreen — seção Equipe verbatim (4 cards)", () => {

  it("exibe título da seção Equipe", () => {
    wrap(<SobreScreen />)
    expect(screen.getByText("Equipe")).toBeTruthy()
  })

  it("exibe card 'Fundadores'", () => {
    wrap(<SobreScreen />)
    expect(screen.getByText("Fundadores")).toBeTruthy()
    expect(screen.getByText(/colaboração comunitária/i)).toBeTruthy()
  })

  it("exibe card 'Equipe de Produto'", () => {
    wrap(<SobreScreen />)
    expect(screen.getByText("Equipe de Produto")).toBeTruthy()
    expect(screen.getByText(/chat integrado/i)).toBeTruthy()
  })

  it("exibe card 'Suporte 7 dias por semana'", () => {
    wrap(<SobreScreen />)
    expect(screen.getByText("Suporte 7 dias por semana")).toBeTruthy()
  })

  it("exibe card 'Rede de Proprietários Fundadores'", () => {
    wrap(<SobreScreen />)
    expect(screen.getByText("Rede de Proprietários Fundadores")).toBeTruthy()
    expect(screen.getByText(/benefícios exclusivos/i)).toBeTruthy()
  })

})

describe("SobreScreen — seção Desenvolvimento verbatim", () => {

  it("exibe título da seção Desenvolvimento", () => {
    wrap(<SobreScreen />)
    expect(screen.getByText("Desenvolvimento")).toBeTruthy()
  })

  it("exibe subtítulo da seção verbatim", () => {
    wrap(<SobreScreen />)
    expect(
      screen.getByText(/parceria técnica especializada/i)
    ).toBeTruthy()
  })

  it("exibe descrição da Pratika-IA verbatim", () => {
    wrap(<SobreScreen />)
    expect(screen.getByText(/desenvolvimento completo da plataforma ShareO/i)).toBeTruthy()
  })

})

describe("SobreScreen — CTA verbatim", () => {

  it("exibe título do CTA verbatim", () => {
    wrap(<SobreScreen />)
    expect(screen.getByText("Faça parte da comunidade ShareO")).toBeTruthy()
  })

  it("exibe subtítulo do CTA verbatim", () => {
    wrap(<SobreScreen />)
    expect(screen.getByText(/Cadastre seu item hoje/i)).toBeTruthy()
  })

  it("exibe botão 'Cadastrar meu item' acessível", () => {
    wrap(<SobreScreen />)
    expect(
      screen.getByRole("button", { name: /Cadastrar meu item/i })
    ).toBeTruthy()
  })

  it("exibe botão 'Explorar anúncios' acessível", () => {
    wrap(<SobreScreen />)
    expect(
      screen.getByRole("button", { name: /Explorar anúncios/i })
    ).toBeTruthy()
  })

  it("botão 'Cadastrar meu item' navega para /itens/novo", () => {
    wrap(<SobreScreen />)
    fireEvent.press(screen.getByRole("button", { name: /Cadastrar meu item/i }))
    expect(router.push).toHaveBeenCalledWith("/itens/novo")
  })

  it("botão 'Explorar anúncios' navega para /(tabs)/explorar", () => {
    wrap(<SobreScreen />)
    fireEvent.press(screen.getByRole("button", { name: /Explorar anúncios/i }))
    expect(router.push).toHaveBeenCalledWith("/(tabs)/explorar")
  })

})

describe("SobreScreen — navegação de volta", () => {

  it("exibe botão Voltar acessível", () => {
    wrap(<SobreScreen />)
    expect(
      screen.getByRole("button", { name: /Voltar/i })
    ).toBeTruthy()
  })

  it("botão Voltar chama router.back()", () => {
    wrap(<SobreScreen />)
    fireEvent.press(screen.getByRole("button", { name: /Voltar/i }))
    expect(router.back).toHaveBeenCalled()
  })

})
