// Fonte: apps/mobile/lib/forms.ts (espelho de lib/forms/masks.ts do site)
//
// Testa maskPhone nas bordas onde a cópia inline de app/perfil/editar.tsx
// divergia do helper canônico:
//
//   BUG 1 — 1–2 dígitos: inline retornava `(${digits}` (parêntese sem fechar);
//            o helper correto retorna os dígitos puros.
//   BUG 2 — 7 dígitos: inline usava `<= 6`, portanto com 7 dígitos produzia
//            o ramo de 4 dígitos (`(XX) XXXX-X`) em vez de `(XX) XXXXX`.
//
// PROVA DE MUTAÇÃO: reverter maskPhone para a versão inline defeituosa e rodar
// os casos de 1, 2 e 7 dígitos deve reprovar este teste.

import { maskPhone, phoneToE164 } from "../forms"

// ── maskPhone — casos limites onde as duas versões divergiam ─────────────────

describe("maskPhone — bordas críticas (BUG 1 e BUG 2)", () => {
  // BUG 1: com 1 dígito a versão inline retornava "(8" — parêntese sem fechar
  it("1 dígito → dígito puro, sem parêntese", () => {
    expect(maskPhone("8")).toBe("8")
  })

  // BUG 1: com 2 dígitos a versão inline retornava "(84" — parêntese sem fechar
  it("2 dígitos → dígitos puros, sem parêntese", () => {
    expect(maskPhone("84")).toBe("84")
  })

  // BUG 2: com 7 dígitos inline usava `<= 6`, caindo no ramo errado.
  // Correto: "(84) 99999" (5 dígitos após o DDD, sem traço ainda)
  it("7 dígitos → (XX) XXXXX sem traço", () => {
    expect(maskPhone("8499999")).toBe("(84) 99999")
  })

  // ── Casos de regressão — não divergiam, mas provam os outros ramos ───────

  // 10 dígitos → fixo (DDD 2 + 4 + 4): "(84) 9999-0000"
  it("10 dígitos → (XX) XXXX-XXXX", () => {
    expect(maskPhone("8499990000")).toBe("(84) 9999-0000")
  })

  // 11 dígitos → celular com 9: "(84) 99999-0000"
  it("11 dígitos → (XX) XXXXX-XXXX", () => {
    expect(maskPhone("84999990000")).toBe("(84) 99999-0000")
  })

  // 0 dígitos → string vazia
  it("string vazia → string vazia", () => {
    expect(maskPhone("")).toBe("")
  })

  // ignora não-dígitos e trunca em 11
  it("máscara já aplicada como entrada → idempotente", () => {
    expect(maskPhone("(84) 99999-0000")).toBe("(84) 99999-0000")
  })

  // trunca em 11 dígitos
  it("12 dígitos → trunca no 11.º dígito", () => {
    expect(maskPhone("849999900001")).toBe("(84) 99999-0000")
  })
})

// ── phoneToE164 — converte máscara para +55... ───────────────────────────────

describe("phoneToE164", () => {
  it("11 dígitos mascarados → +55 + 11 dígitos", () => {
    expect(phoneToE164("(84) 99999-0000")).toBe("+5584999990000")
  })

  it("10 dígitos mascarados → +55 + 10 dígitos", () => {
    // (84) 9999-0000 → 8499990000 (10 dígitos) → +558499990000
    expect(phoneToE164("(84) 9999-0000")).toBe("+558499990000")
  })

  it("menos de 10 dígitos → undefined (número incompleto)", () => {
    expect(phoneToE164("(84) 999")).toBeUndefined()
  })

  it("string vazia → undefined", () => {
    expect(phoneToE164("")).toBeUndefined()
  })
})
