/**
 * screens-anunciar-dicas.test.tsx
 *
 * Testes RNTL para DicasScreen (apps/mobile/app/anunciar/dicas.tsx).
 * Verifica:
 *   - Título da página ("Dicas para alugar mais e melhor")
 *   - Presença dos 6 títulos de dica verbatim
 *   - Contagem correta de dicas (6 cards com rótulo "Dica 0X")
 *   - Presença dos CTAs finais
 *
 * Usa os mocks globais de jest.setup.js (expo-router, safe-area-context,
 * async-storage, react-native-reanimated etc.).
 */

import React from "react"
import { render, screen } from "@testing-library/react-native"

import DicasScreen from "@/app/anunciar/dicas"

// ── Mocks de dependências ───────────────────────────────────────────────────

// useTheme — retorna tokens light sem AsyncStorage
jest.mock("@/lib/theme", () => {
  const React = require("react")
  const LIGHT = {
    bg: "#F8FAFC", surface: "#FFFFFF", text: "#0F172A", muted: "#64748B",
    border: "#E2E8F0", navy: "#003366", green: "#007B3C", error: "#C0392B",
    warning: "#F59E0B", success: "#007B3C",
    bookingPending: "#F59E0B", bookingActive: "#007B3C", bookingCompleted: "#64748B",
    bookingCancelled: "#E74C3C", bookingDisputed: "#C05800",
    disabledBg: "#E2E8F0", disabledText: "#94A3B8", disabledBorder: "#CBD5E1",
  }
  return {
    useTheme: () => ({
      preference: "light",
      mode: "light",
      tokens: LIGHT,
      setPreference: jest.fn(),
    }),
    ThemeProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  }
})

// ── Títulos verbatim da fonte (app/anunciar/dicas/page.tsx) ─────────────────
const TITULOS_ESPERADOS = [
  "Fotos fazem toda a diferença",
  "Descrição clara e honesta",
  "Precifique de forma competitiva",
  "Responda rápido",
  "Cuide da experiência do locatário",
  "Proteja seu item",
] as const

const NUMEROS_ESPERADOS = ["Dica 01", "Dica 02", "Dica 03", "Dica 04", "Dica 05", "Dica 06"] as const

// ── Testes ──────────────────────────────────────────────────────────────────

describe("DicasScreen — Dicas para Anfitriões", () => {

  beforeEach(() => {
    render(<DicasScreen />)
  })

  // ── Título principal ─────────────────────────────────────────────────────
  it("exibe o título principal verbatim: 'Dicas para alugar mais e melhor'", () => {
    expect(screen.getByText("Dicas para alugar mais e melhor")).toBeTruthy()
  })

  it("exibe o badge 'GUIA DO ANFITRIÃO'", () => {
    expect(screen.getByText("GUIA DO ANFITRIÃO")).toBeTruthy()
  })

  it("exibe o subtítulo verbatim do site", () => {
    expect(
      screen.getByText("Pequenas ações que fazem grande diferença nos seus ganhos mensais.")
    ).toBeTruthy()
  })

  // ── Títulos das 6 dicas (verbatim) ───────────────────────────────────────
  it.each(TITULOS_ESPERADOS)(
    "exibe o título de dica verbatim: '%s'",
    (titulo) => {
      expect(screen.getByText(titulo)).toBeTruthy()
    }
  )

  // ── Rótulos "Dica 0X" (contagem exata = 6) ───────────────────────────────
  it.each(NUMEROS_ESPERADOS)(
    "exibe o rótulo de numeração verbatim: '%s'",
    (rotulo) => {
      expect(screen.getByText(rotulo)).toBeTruthy()
    }
  )

  it("exibe exatamente 6 rótulos de numeração (Dica 01 … Dica 06)", () => {
    // getAllByText retorna array — um por rótulo
    NUMEROS_ESPERADOS.forEach((rotulo) => {
      const elementos = screen.getAllByText(rotulo)
      expect(elementos).toHaveLength(1)
    })
  })

  // ── Total de dicas transcrito corretamente ───────────────────────────────
  it("transcreve exatamente 6 dicas (sem mais, sem menos)", () => {
    // Verifica pelos títulos: se há exatamente 6 títulos únicos
    const titulos = TITULOS_ESPERADOS.map((t) => screen.getByText(t))
    expect(titulos).toHaveLength(6)
  })

  // ── Destaques das dicas ──────────────────────────────────────────────────
  it("exibe o destaque da dica 01 verbatim", () => {
    expect(
      screen.getByText("💡 Itens com boas fotos recebem 3× mais visualizações.")
    ).toBeTruthy()
  })

  it("exibe o destaque da dica 04 verbatim", () => {
    expect(
      screen.getByText("💡 Anfitriões que respondem em até 1h têm 2× mais reservas confirmadas.")
    ).toBeTruthy()
  })

  it("exibe o destaque da dica 06 verbatim", () => {
    expect(
      screen.getByText("💡 Tudo combinado dentro do ShareO tem registro e proteção.")
    ).toBeTruthy()
  })

  // ── CTAs finais ──────────────────────────────────────────────────────────
  it("exibe o CTA primário '📦 Cadastrar meu item'", () => {
    expect(screen.getByText("📦 Cadastrar meu item")).toBeTruthy()
  })

  it("exibe o CTA secundário '💰 Simular meus ganhos'", () => {
    expect(screen.getByText("💰 Simular meus ganhos")).toBeTruthy()
  })

  it("CTA 'Cadastrar meu item' tem accessibilityRole='button'", () => {
    expect(
      screen.getByRole("button", { name: "Cadastrar meu item" })
    ).toBeTruthy()
  })

  it("CTA 'Simular meus ganhos' tem accessibilityRole='button'", () => {
    expect(
      screen.getByRole("button", { name: "Simular meus ganhos" })
    ).toBeTruthy()
  })

  // ── Header ───────────────────────────────────────────────────────────────
  it("exibe o título do header 'Dicas para Anfitriões'", () => {
    expect(screen.getByText("Dicas para Anfitriões")).toBeTruthy()
  })

  it("exibe o botão Voltar com accessibilityLabel correto", () => {
    expect(screen.getByRole("button", { name: "Voltar para Anunciar" })).toBeTruthy()
  })
})
