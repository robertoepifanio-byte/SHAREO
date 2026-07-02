/**
 * Testes unitários para helpers de criação de anúncio (app/itens/novo.tsx).
 * Testa parseBRL e fmtInputBRL sem depender de componentes RN.
 */

// Replicação das funções puras do componente para teste isolado
function parseBRL(v: string): number {
  const cleaned = v.replace(/[^\d,]/g, "").replace(",", ".")
  const n = parseFloat(cleaned)
  return isNaN(n) ? 0 : Math.round(n * 100)
}

function fmtInputBRL(cents: number): string {
  if (cents === 0) return ""
  return (cents / 100).toFixed(2).replace(".", ",")
}

describe("parseBRL", () => {
  it("converte string decimal brasileiro em centavos", () => {
    expect(parseBRL("35,00")).toBe(3500)
    expect(parseBRL("1,50")).toBe(150)
    expect(parseBRL("100,00")).toBe(10000)
  })

  it("ignora prefixo R$", () => {
    expect(parseBRL("R$ 50,00")).toBe(5000)
  })

  it("retorna 0 para string vazia", () => {
    expect(parseBRL("")).toBe(0)
  })

  it("retorna 0 para string inválida", () => {
    expect(parseBRL("abc")).toBe(0)
  })

  it("arredonda corretamente", () => {
    expect(parseBRL("1,999")).toBe(200) // arredondamento de 1.999 → 2.00 → 200
  })
})

describe("fmtInputBRL", () => {
  it("formata centavos como string BRL com vírgula", () => {
    expect(fmtInputBRL(3500)).toBe("35,00")
    expect(fmtInputBRL(150)).toBe("1,50")
    expect(fmtInputBRL(10000)).toBe("100,00")
  })

  it("retorna string vazia para 0", () => {
    expect(fmtInputBRL(0)).toBe("")
  })
})

describe("parseBRL round-trip", () => {
  it("parseBRL(fmtInputBRL(x)) === x para valores positivos", () => {
    for (const cents of [100, 3500, 15000, 50000]) {
      expect(parseBRL(fmtInputBRL(cents))).toBe(cents)
    }
  })
})
