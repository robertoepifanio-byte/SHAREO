import { getAmbassadorTier, tierProgress, getTierLabel, getTierCommissionRateBp } from "@/lib/ambassador"

describe("getAmbassadorTier — comportamento padrão (silver=11, gold=51)", () => {
  it("0 indicados → null", () => {
    expect(getAmbassadorTier(0)).toBeNull()
  })

  it("1 indicado → BRONZE", () => {
    expect(getAmbassadorTier(1)).toBe("BRONZE")
  })

  it("10 indicados → BRONZE (abaixo do limiar Prata)", () => {
    expect(getAmbassadorTier(10)).toBe("BRONZE")
  })

  it("11 indicados → SILVER (exatamente no limiar)", () => {
    expect(getAmbassadorTier(11)).toBe("SILVER")
  })

  it("50 indicados → SILVER (abaixo do limiar Ouro)", () => {
    expect(getAmbassadorTier(50)).toBe("SILVER")
  })

  it("51 indicados → GOLD (exatamente no limiar)", () => {
    expect(getAmbassadorTier(51)).toBe("GOLD")
  })

  it("1000 indicados → GOLD", () => {
    expect(getAmbassadorTier(1000)).toBe("GOLD")
  })
})

describe("getAmbassadorTier — thresholds customizados", () => {
  it("silver=5, gold=20 — 4 indicados → BRONZE", () => {
    expect(getAmbassadorTier(4, 5, 20)).toBe("BRONZE")
  })

  it("silver=5, gold=20 — 5 indicados → SILVER (exato)", () => {
    expect(getAmbassadorTier(5, 5, 20)).toBe("SILVER")
  })

  it("silver=5, gold=20 — 19 indicados → SILVER", () => {
    expect(getAmbassadorTier(19, 5, 20)).toBe("SILVER")
  })

  it("silver=5, gold=20 — 20 indicados → GOLD (exato)", () => {
    expect(getAmbassadorTier(20, 5, 20)).toBe("GOLD")
  })

  it("threshold customizado diferencia de comportamento com default", () => {
    // 10 indicados → BRONZE no default (silver=11), mas SILVER com silver=5
    expect(getAmbassadorTier(10)).toBe("BRONZE")
    expect(getAmbassadorTier(10, 5, 20)).toBe("SILVER")
  })

  it("silver=1, gold=2 — thresholds mínimos funcionam", () => {
    expect(getAmbassadorTier(1, 1, 2)).toBe("SILVER")
    expect(getAmbassadorTier(2, 1, 2)).toBe("GOLD")
  })
})

describe("tierProgress — comportamento padrão (silver=11, gold=51)", () => {
  it("0 indicados → próximo tier BRONZE, faltam 1", () => {
    const p = tierProgress(0)
    expect(p.nextTier).toBe("BRONZE")
    expect(p.needed).toBe(1)
  })

  it("1 indicado → próximo tier SILVER, faltam 10", () => {
    const p = tierProgress(1)
    expect(p.nextTier).toBe("SILVER")
    expect(p.needed).toBe(10)
  })

  it("10 indicados → próximo tier SILVER, falta 1", () => {
    const p = tierProgress(10)
    expect(p.nextTier).toBe("SILVER")
    expect(p.needed).toBe(1)
  })

  it("11 indicados (Prata) → próximo tier GOLD, faltam 40", () => {
    const p = tierProgress(11)
    expect(p.nextTier).toBe("GOLD")
    expect(p.needed).toBe(40)
  })

  it("50 indicados → próximo tier GOLD, falta 1", () => {
    const p = tierProgress(50)
    expect(p.nextTier).toBe("GOLD")
    expect(p.needed).toBe(1)
  })

  it("51 indicados (Ouro) → sem próximo tier, needed = 0", () => {
    const p = tierProgress(51)
    expect(p.nextTier).toBeNull()
    expect(p.needed).toBe(0)
  })

  it("1000 indicados → sem próximo tier", () => {
    const p = tierProgress(1000)
    expect(p.nextTier).toBeNull()
    expect(p.needed).toBe(0)
  })
})

describe("tierProgress — thresholds customizados", () => {
  it("silver=5, gold=20 — 3 indicados → SILVER, faltam 2", () => {
    const p = tierProgress(3, 5, 20)
    expect(p.nextTier).toBe("SILVER")
    expect(p.needed).toBe(2)
  })

  it("silver=5, gold=20 — 5 indicados → GOLD, faltam 15", () => {
    const p = tierProgress(5, 5, 20)
    expect(p.nextTier).toBe("GOLD")
    expect(p.needed).toBe(15)
  })

  it("silver=5, gold=20 — 20 indicados → null, needed = 0", () => {
    const p = tierProgress(20, 5, 20)
    expect(p.nextTier).toBeNull()
    expect(p.needed).toBe(0)
  })

  it("needed nunca é negativo com qualquer threshold", () => {
    expect(tierProgress(100, 5, 20).needed).toBeGreaterThanOrEqual(0)
    expect(tierProgress(0, 11, 51).needed).toBeGreaterThanOrEqual(0)
  })
})

describe("getTierLabel", () => {
  it("GOLD → Ouro", ()  => expect(getTierLabel("GOLD")).toBe("Ouro"))
  it("SILVER → Prata",  () => expect(getTierLabel("SILVER")).toBe("Prata"))
  it("BRONZE → Bronze", () => expect(getTierLabel("BRONZE")).toBe("Bronze"))
  it("null → Sem tier", () => expect(getTierLabel(null)).toBe("Sem tier"))
})

describe("getTierCommissionRateBp", () => {
  it("GOLD → 700 bps (7%)",   () => expect(getTierCommissionRateBp("GOLD")).toBe(700))
  it("SILVER → 500 bps (5%)", () => expect(getTierCommissionRateBp("SILVER")).toBe(500))
  it("BRONZE → 300 bps (3%)", () => expect(getTierCommissionRateBp("BRONZE")).toBe(300))
})
