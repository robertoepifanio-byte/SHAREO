/**
 * lib/payments/extension.ts — preço das diárias extras (ATOR-03).
 *
 * O defeito original: aprovar uma extensão não cobrava nada. Aqui o que se
 * tranca é o CÁLCULO — quantos dias e quanto custa — porque é dele que sai o
 * valor cobrado do locatário e o repasse ao proprietário.
 */
import { diasExtras, valorExtensao } from "@/lib/payments/extension"

const d = (iso: string) => new Date(iso)

describe("diasExtras", () => {
  it("conta os dias inteiros acrescentados", () => {
    expect(diasExtras(d("2026-08-24T12:00:00Z"), d("2026-08-27T12:00:00Z"))).toBe(3)
  })

  it("arredonda fração para CIMA — meio dia a mais é um dia cobrado", () => {
    // A locação já conta período em dias inteiros (`totalDays`); cobrar por
    // fração seria uma segunda régua.
    expect(diasExtras(d("2026-08-24T12:00:00Z"), d("2026-08-26T00:00:00Z"))).toBe(2)
    expect(diasExtras(d("2026-08-24T12:00:00Z"), d("2026-08-24T13:00:00Z"))).toBe(1)
  })

  it("🪤 nunca devolve negativo, mesmo com data anterior", () => {
    // O POST valida que a data é posterior, mas depender dessa validação faria
    // o cálculo de DINHEIRO refém de um guard em outro arquivo. Uma extensão
    // "para trás" cobraria valor negativo e reduziria o total da locação.
    expect(diasExtras(d("2026-08-24T12:00:00Z"), d("2026-08-20T12:00:00Z"))).toBe(0)
  })

  it("mesma data = zero dias", () => {
    expect(diasExtras(d("2026-08-24T12:00:00Z"), d("2026-08-24T12:00:00Z"))).toBe(0)
  })
})

describe("valorExtensao", () => {
  it("multiplica a diária pelos dias", () => {
    expect(valorExtensao(3500, 3)).toBe(10500)
  })

  it("zero dias não cobra nada", () => {
    expect(valorExtensao(3500, 0)).toBe(0)
  })
})
