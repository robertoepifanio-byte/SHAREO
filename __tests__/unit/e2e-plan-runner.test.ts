/**
 * Guarda do fecho de veredito dos planos E2E.
 *
 * Por que este teste existe: os specs `e2e-*-plan.spec.ts` calculavam veredito
 * `PARCIAL` quando um step high/medium falhava, gravavam isso no JSON de relatório
 * e NÃO lançavam nada — o Playwright dava o teste como `passed`. Regressão em
 * compartilhamento, /admin, XSS e a11y passava verde no gate de CI.
 *
 * O arquivo de teste mora aqui e não em `e2e/` porque `e2e/` está em
 * `testPathIgnorePatterns` do jest (é território do Playwright) — o import
 * atravessa a fronteira, a descoberta de teste não.
 */
import { assertNoFailedSteps, type PlanStepLike } from "../../e2e/_support"

const passou  = (name: string): PlanStepLike => ({ name, status: "passed" })
const pulou   = (name: string): PlanStepLike => ({ name, status: "skipped" })
const falhou  = (name: string, error?: string): PlanStepLike => ({ name, status: "failed", error })

describe("assertNoFailedSteps", () => {
  it("não lança quando todos os steps passaram", () => {
    expect(() =>
      assertNoFailedSteps("Plano X", [passou("1. login"), passou("2. logout")]),
    ).not.toThrow()
  })

  it("não lança quando há steps pulados mas nenhum falho", () => {
    // Skip por fixture ausente é opt-in legítimo da suíte, não defeito.
    expect(() =>
      assertNoFailedSteps("Plano X", [passou("1. login"), pulou("2. sem fixture")]),
    ).not.toThrow()
  })

  it("LANÇA quando um step CONTINUAR falhou — o defeito que este helper corrige", () => {
    expect(() =>
      assertNoFailedSteps("Plano 3 — Administração", [
        passou("1. login admin"),
        falhou("2. usuário comum bloqueado de /admin", "Expected 403, got 200"),
      ]),
    ).toThrow(/veredito PARCIAL/)
  })

  it("nomeia o plano, conta os steps e cita o erro original na mensagem", () => {
    let msg = ""
    try {
      assertNoFailedSteps("Plano 2 — Compartilhamento", [
        passou("1. abrir item"),
        falhou("3. gerar link", "locator.click: Timeout 25000ms exceeded"),
        falhou("4. acesso externo", "Expected 200, got 404"),
      ])
    } catch (e) {
      msg = (e as Error).message
    }
    expect(msg).toContain("Plano 2 — Compartilhamento")
    expect(msg).toContain("2 de 3 steps falharam")
    expect(msg).toContain("3. gerar link")
    expect(msg).toContain("Timeout 25000ms exceeded")
    expect(msg).toContain("4. acesso externo")
  })

  it("preserva o erro original do step crítico em vez de embrulhar", () => {
    // O abort de step crítico já carrega stack e mensagem úteis: re-lançar o
    // mesmo objeto mantém o diagnóstico que o Playwright exibe no relatório.
    const original = new Error("sessão não expirou após troca de senha")
    expect(() =>
      assertNoFailedSteps("Plano Segurança", [falhou("1. sessão expirada")], original),
    ).toThrow(original)
  })

  it("prioriza o abort sobre a contagem de falhas", () => {
    const original = new Error("abort crítico")
    let capturado: unknown
    try {
      assertNoFailedSteps(
        "Plano Segurança",
        [falhou("1. crítico"), falhou("2. high")],
        original,
      )
    } catch (e) {
      capturado = e
    }
    expect(capturado).toBe(original)
  })

  it("tolera step falho sem mensagem de erro", () => {
    expect(() => assertNoFailedSteps("Plano X", [falhou("2. sem detalhe")])).toThrow(
      /sem mensagem de erro/,
    )
  })
})
