/**
 * Testes das funções puras de máscara de input.
 * Fonte: apps/campanha/lib/forms/masks.ts
 *
 * Por serem funções puras (sem efeitos colaterais, sem I/O, sem estado),
 * estes testes são os mais baratos do projeto: executam em <1 ms cada um
 * e nunca falam com banco, rede ou DOM.
 */
import { maskCEP, maskPhone } from "@/lib/forms/masks"

// ─── maskCEP ─────────────────────────────────────────────────────────────────

describe("maskCEP", () => {
  it("formata 8 dígitos para XXXXX-XXX", () => {
    expect(maskCEP("59015040")).toBe("59015-040")
  })

  it("entrada parcial com menos de 5 dígitos — sem traço", () => {
    expect(maskCEP("5901")).toBe("5901")
    expect(maskCEP("59")).toBe("59")
    expect(maskCEP("")).toBe("")
  })

  it("entrada parcial no intervalo [6, 7] dígitos — com traço", () => {
    expect(maskCEP("590150")).toBe("59015-0")
    expect(maskCEP("5901504")).toBe("59015-04")
  })

  it("CEP já formatado com traço não é duplicado", () => {
    // O usuário digita o próprio traço — deve ser tratado igual ao sem traço.
    expect(maskCEP("59015-040")).toBe("59015-040")
  })

  it("caracteres não numéricos são ignorados", () => {
    expect(maskCEP("abc59015040xyz")).toBe("59015-040")
    expect(maskCEP("  59 015 040  ")).toBe("59015-040")
  })

  it("limita a 8 dígitos — excedente é truncado", () => {
    // Colar/auto-preencher pode trazer 9+ caracteres.
    expect(maskCEP("590150409999")).toBe("59015-040")
  })

  it("5 dígitos exatos — sem traço ainda (borda do limite)", () => {
    expect(maskCEP("59015")).toBe("59015")
  })
})

// ─── maskPhone ───────────────────────────────────────────────────────────────

describe("maskPhone", () => {
  it("10 dígitos (fixo) → (XX) XXXX-XXXX", () => {
    expect(maskPhone("8422223333")).toBe("(84) 2222-3333")
  })

  it("11 dígitos (celular) → (XX) XXXXX-XXXX", () => {
    expect(maskPhone("84999990000")).toBe("(84) 99999-0000")
  })

  it("entrada com máscara já aplicada é estável (idempotente)", () => {
    expect(maskPhone("(84) 99999-0000")).toBe("(84) 99999-0000")
    expect(maskPhone("(84) 2222-3333")).toBe("(84) 2222-3333")
  })

  it("caracteres não numéricos são ignorados", () => {
    // "abc8499990000xyz" → 10 dígitos → formato fixo
    expect(maskPhone("abc8499990000xyz")).toBe("(84) 9999-0000")
    // "abc84999990000xyz" → 11 dígitos → formato celular
    expect(maskPhone("abc84999990000xyz")).toBe("(84) 99999-0000")
  })

  it("entrada parcial — 1-2 dígitos: retorna o bruto", () => {
    expect(maskPhone("8")).toBe("8")
    expect(maskPhone("84")).toBe("84")
  })

  it("entrada parcial — 3-7 dígitos: (DDD) prefixo", () => {
    expect(maskPhone("849")).toBe("(84) 9")
    expect(maskPhone("8499")).toBe("(84) 99")
    expect(maskPhone("8499999")).toBe("(84) 99999")
  })

  it("entrada parcial — 8-10 dígitos: formato fixo intermediário", () => {
    // 8 dígitos → (XX) XXXX-XXXX parcial
    expect(maskPhone("84222233")).toBe("(84) 2222-33")
    // 10 dígitos → fixo completo
    expect(maskPhone("8422223333")).toBe("(84) 2222-3333")
  })

  it("limita a 11 dígitos — excedente é truncado", () => {
    // 84 + 9 dígitos de ramal extra
    expect(maskPhone("84999900001234567")).toBe("(84) 99990-0001")
  })

  it("entrada vazia retorna vazio", () => {
    expect(maskPhone("")).toBe("")
  })
})
