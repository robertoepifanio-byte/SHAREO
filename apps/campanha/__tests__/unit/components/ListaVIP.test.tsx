/**
 * Testes da prova social (ListaVIP).
 * Fonte: apps/campanha/components/ListaVIP.tsx
 *
 * ListaVIP é um Server Component assíncrono: ele chama `fetch()` durante o
 * render e devolve um elemento React. A estratégia é:
 *   1. Mockar `global.fetch` para controlar o retorno de /api/founders/stats
 *   2. Chamar `await ListaVIP({})` para obter o elemento resolvido
 *   3. Renderizar com RTL e verificar o texto
 *
 * Funciona porque Server Components são funções async comuns do ponto de
 * vista do Jest — só o bundler Next.js os trata de forma especial em produção.
 *
 * Coberturas:
 *   - total >= 10 e thisWeek > 0  → "X pessoas entraram esta semana"
 *   - total >= 10 e thisWeek = 0  → "X pessoas já estão na lista"
 *   - total = 10 (borda)          → ainda exibe contagem
 *   - total < 10                  → "Seja um dos primeiros fundadores..."
 *   - total = 0                   → mensagem de "primeiros" (sem "0 pessoas")
 *   - falha de fetch              → silencia e exibe "primeiros" (fail-closed)
 *   - resposta não-ok             → silencia e exibe "primeiros"
 */

import React from "react"
import { render, screen } from "@testing-library/react"
import { ListaVIP } from "@/components/ListaVIP"

// FounderCaptureForm é um Client Component importado pelo ListaVIP.
// Mockamos para isolar a prova social — o formulário tem seus próprios testes.
jest.mock("@/components/FounderCaptureForm", () => ({
  FounderCaptureForm: () => null,
}))

// PrelaunchBadge — componente de UI, irrelevante para os testes de prova social.
jest.mock("@/components/PrelaunchBadge", () => ({
  PrelaunchBadge: () => null,
}))

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mockStats(total: number, thisWeek: number) {
  ;(global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: async () => ({ data: { total, thisWeek } }),
  })
}

// ─── Testes ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  global.fetch = jest.fn()
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe("ListaVIP — prova social (P1)", () => {
  /**
   * Limiar de 10: abaixo esconde para não exibir "2 pessoas na lista"
   * numa campanha paga — pior do que não mostrar nada.
   */
  it("total >= 10 e thisWeek > 0 → exibe contagem semanal", async () => {
    mockStats(150, 23)

    render(await ListaVIP({ as: "h2", hideBadge: true }))

    expect(screen.getByText(/23 pessoas entraram esta semana/i)).toBeInTheDocument()
    expect(screen.queryByText(/seja um dos primeiros/i)).toBeNull()
  })

  it("total >= 10 e thisWeek = 0 → exibe total acumulado", async () => {
    mockStats(87, 0)

    render(await ListaVIP({ as: "h2", hideBadge: true }))

    expect(screen.getByText(/87 pessoas já estão na lista/i)).toBeInTheDocument()
    expect(screen.queryByText(/seja um dos primeiros/i)).toBeNull()
  })

  it("total = 10 (borda do limiar) → ainda exibe contagem", async () => {
    mockStats(10, 0)

    render(await ListaVIP({ as: "h2", hideBadge: true }))

    expect(screen.getByText(/10 pessoas já estão na lista/i)).toBeInTheDocument()
  })

  it("total = 9 (abaixo do limiar) → exibe mensagem de 'primeiros'", async () => {
    mockStats(9, 3)

    render(await ListaVIP({ as: "h2", hideBadge: true }))

    expect(
      screen.getByText(/seja um dos primeiros fundadores do shareo no brasil/i),
    ).toBeInTheDocument()
    // Números reais não devem vazar abaixo do limiar
    expect(screen.queryByText(/pessoas/)).toBeNull()
  })

  it("total = 0 → exibe mensagem de 'primeiros' — sem 'N pessoas'", async () => {
    mockStats(0, 0)

    render(await ListaVIP({ as: "h2", hideBadge: true }))

    expect(
      screen.getByText(/seja um dos primeiros fundadores do shareo no brasil/i),
    ).toBeInTheDocument()
    expect(screen.queryByText(/0 pessoas/)).toBeNull()
  })

  it("falha de fetch → silencia e exibe mensagem de 'primeiros' (fail-closed)", async () => {
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error("network error"))

    render(await ListaVIP({ as: "h2", hideBadge: true }))

    // Qualquer erro → zeros internos → mensagem de "primeiros",
    // nunca "0 pessoas já estão na lista".
    expect(
      screen.getByText(/seja um dos primeiros fundadores do shareo no brasil/i),
    ).toBeInTheDocument()
    expect(screen.queryByText(/0 pessoas/)).toBeNull()
  })

  it("resposta não-ok do servidor → silencia e exibe mensagem de 'primeiros'", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({}),
    })

    render(await ListaVIP({ as: "h2", hideBadge: true }))

    expect(
      screen.getByText(/seja um dos primeiros fundadores do shareo no brasil/i),
    ).toBeInTheDocument()
  })
})
