/**
 * pauta-raimundo-2026-08-22, item 2 — decisão de Raimundo (25/08/2026):
 * substitui por completo a política anterior por antecedência. Quem cancela
 * decide o reembolso, não quando.
 */
import { calcRefund, getCancellationPolicyLines } from "@/lib/cancellationPolicy"

describe("calcRefund — cancelamento pelo locador", () => {
  it("locatário recebe 100%, mesmo com taxa Stripe informada (não se aplica ao locador)", () => {
    const result = calcRefund(10_000, "owner", 390)
    expect(result.refundAmount).toBe(10_000)
    expect(result.refundPercent).toBe(100)
  })

  it("reason menciona que a ShareO abre mão da comissão", () => {
    const result = calcRefund(10_000, "owner")
    expect(result.reason).toMatch(/locador/i)
    expect(result.reason).toMatch(/comissão/i)
  })
})

describe("calcRefund — cancelamento pelo locatário", () => {
  it("desconta a taxa real da Stripe do valor devolvido", () => {
    const result = calcRefund(10_000, "borrower", 390)
    expect(result.refundAmount).toBe(9_610)
  })

  it("refundPercent reflete o desconto proporcional", () => {
    const result = calcRefund(10_000, "borrower", 1_000)
    expect(result.refundPercent).toBe(90)
  })

  it("sem taxa apurada (stripeFeeCents omitido ou 0) → reembolso integral, nunca menos", () => {
    expect(calcRefund(10_000, "borrower").refundAmount).toBe(10_000)
    expect(calcRefund(10_000, "borrower", 0).refundAmount).toBe(10_000)
  })

  it("nunca fica negativo — taxa maior que o total é limitada a 0", () => {
    const result = calcRefund(500, "borrower", 900)
    expect(result.refundAmount).toBe(0)
  })

  it("reason menciona a Stripe e o valor da taxa", () => {
    const result = calcRefund(10_000, "borrower", 390)
    expect(result.reason).toMatch(/Stripe/)
    expect(result.reason).toMatch(/3,90/)
  })
})

describe("calcRefund — propriedades invariantes", () => {
  it("refundAmount nunca excede totalPrice", () => {
    expect(calcRefund(10_000, "owner").refundAmount).toBeLessThanOrEqual(10_000)
    expect(calcRefund(10_000, "borrower", 500).refundAmount).toBeLessThanOrEqual(10_000)
  })

  it("refundAmount é sempre >= 0", () => {
    expect(calcRefund(0, "borrower", 500).refundAmount).toBeGreaterThanOrEqual(0)
  })
})

describe("getCancellationPolicyLines", () => {
  it("retorna 2 linhas — locador e locatário", () => {
    const lines = getCancellationPolicyLines()
    expect(lines).toHaveLength(2)
  })

  it("descreve reembolso integral para os dois lados, sem menção a antecedência/horas", () => {
    const lines = getCancellationPolicyLines()
    const allText = lines.map((l) => `${l.label} ${l.detail}`).join(" ")
    expect(allText).toMatch(/100%/)
    expect(allText).not.toMatch(/hora/i)
  })

  it("só a linha do locatário menciona a taxa da Stripe", () => {
    const lines = getCancellationPolicyLines()
    const locador   = lines.find((l) => l.label.includes("locador"))!
    const locatario = lines.find((l) => l.label.includes("locatário"))!
    expect(locador.detail).not.toMatch(/Stripe/)
    expect(locatario.detail).toMatch(/Stripe/)
  })
})

/**
 * 🪤 A política mudou em 25/08/2026 — a antecedência deixou de importar — mas
 * duas telas continuaram prometendo a regra antiga por mais de uma semana:
 * `/reservas/sucesso` dizia "Cancelamento gratuito até 24h antes da data de
 * retirada", e a página do item prometia "Reembolso integral se você cancelar",
 * omitindo a taxa da Stripe que o locatário absorve.
 *
 * O código estava certo e a `/ajuda` também; só as caixas de confiança ficaram
 * para trás. Nenhum teste olhava para elas, porque são texto solto num array.
 */
describe("as caixas de confiança não podem prometer a política abolida", () => {
  const TELAS = ["app/reservas/sucesso/page.tsx", "app/itens/[id]/page.tsx"]

  it.each(TELAS)("%s não ressuscita a regra por antecedência", (rel) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("node:fs") as typeof import("node:fs")
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require("node:path") as typeof import("node:path")
    const texto = fs.readFileSync(path.resolve(__dirname, "../../..", rel), "utf8")

    expect(texto).not.toMatch(/antes da data de retirada/)
    expect(texto).not.toMatch(/[Cc]ancelamento gratuito/)
    // "integral" sem a ressalva da taxa promete mais do que calcRefund entrega
    // quando quem cancela é o locatário.
    expect(texto).not.toMatch(/[Rr]eembolso integral se você cancelar/)
  })
})
