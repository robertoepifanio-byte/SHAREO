/**
 * Prazos de expiração das Checkout Sessions.
 *
 * O defeito que isto tranca: `STRIPE_CHARGE_EXPIRES_SECONDS` valia **72h**,
 * copiado da cobrança de taxa de atraso — que nunca foi exercitada, então o
 * erro ficou latente. A Stripe exige `expires_at` entre **30 minutos e 24
 * horas** da criação e recusa a sessão fora disso; o usuário via só
 * "Erro interno" ao tentar pagar as diárias extras de uma extensão (24/08/2026).
 *
 * Não é um teste de constante por constante: é o intervalo que a API aceita.
 * Qualquer prazo novo de checkout que nasça fora dele reprova aqui em vez de
 * falhar em produção com mensagem genérica.
 */
import {
  STRIPE_CHECKOUT_EXPIRES_SECONDS,
  STRIPE_CHARGE_EXPIRES_SECONDS,
} from "@/lib/platform-config"

const MIN = 30 * 60          // 30 minutos
const MAX = 24 * 60 * 60     // 24 horas

describe("prazos aceitos pela Stripe em expires_at", () => {
  it.each([
    ["checkout da locação", STRIPE_CHECKOUT_EXPIRES_SECONDS],
    ["cobrança avulsa (taxa de atraso, extensão)", STRIPE_CHARGE_EXPIRES_SECONDS],
  ])("%s fica entre 30 min e 24 h", (_rotulo, segundos) => {
    expect(segundos).toBeGreaterThanOrEqual(MIN)
    expect(segundos).toBeLessThanOrEqual(MAX)
  })

  it("🪤 o teto é 24h — 72h era o valor que a Stripe recusava", () => {
    // Guarda explícita contra a regressão exata: alguém "restaurar" as 72h
    // achando que é só uma preferência de prazo.
    expect(STRIPE_CHARGE_EXPIRES_SECONDS).not.toBe(72 * 60 * 60)
    expect(STRIPE_CHARGE_EXPIRES_SECONDS).toBe(MAX)
  })

  it("a cobrança avulsa expira depois do checkout da locação", () => {
    // A diferença é deliberada: o checkout segura disponibilidade do item e
    // precisa liberar rápido; a cobrança avulsa não bloqueia nada.
    expect(STRIPE_CHARGE_EXPIRES_SECONDS).toBeGreaterThan(STRIPE_CHECKOUT_EXPIRES_SECONDS)
  })
})
