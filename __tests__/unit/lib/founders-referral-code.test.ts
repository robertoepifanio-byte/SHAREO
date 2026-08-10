import { generateReferralCode } from "@/lib/founders"

describe("generateReferralCode", () => {
  it("tem 8 caracteres", () => {
    expect(generateReferralCode()).toHaveLength(8)
  })

  it("usa só o alfabeto sem caracteres ambíguos", () => {
    // Sem 0/O/1/I/L: o código viaja em link de WhatsApp e alguém vai transcrevê-lo
    // à mão. Confundir O com 0 credita a indicação a outra pessoa — ou a ninguém.
    const proibidos = /[01OIL]/
    for (let i = 0; i < 500; i++) {
      const code = generateReferralCode()
      expect(code).toMatch(/^[23456789A-HJ-NP-Z]{8}$/)
      expect(code).not.toMatch(proibidos)
    }
  })

  it("casa com a validação da rota", () => {
    // Mesma regex de app/api/founders/leads/route.ts. Se uma mudar sem a outra,
    // todo link de indicação passa a ser rejeitado em silêncio — o lead entra,
    // só perde a atribuição, então ninguém percebe pelo erro.
    const daRota = /^[23456789A-HJ-NP-Z]{8}$/
    for (let i = 0; i < 200; i++) {
      expect(daRota.test(generateReferralCode())).toBe(true)
    }
  })

  it("não repete em 5000 gerações", () => {
    // Não prova unicidade — a coluna é UNIQUE e a rota tem retry para isso.
    // Prova que o gerador não está preso num valor fixo, que é a falha real
    // possível (ex.: crypto.getRandomValues virando no-op num ambiente).
    const vistos = new Set<string>()
    for (let i = 0; i < 5000; i++) vistos.add(generateReferralCode())
    expect(vistos.size).toBe(5000)
  })
})
