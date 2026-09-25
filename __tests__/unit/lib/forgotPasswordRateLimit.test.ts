/**
 * @jest-environment node
 *
 * Chave do limite por e-mail do esqueci-senha. Deve usar a mesma normalização
 * que o endpoint usa no banco (`emailField()`: trim + minúsculas) e manter o
 * prefixo `forgot:email:` separado do `login:email:`.
 */

import { forgotPasswordEmailKey } from "@/lib/forgotPasswordRateLimit"
import { emailField } from "@/lib/validations/auth"

// A chave não usa o limitador; o mock evita carregar os pacotes ESM do Upstash.
jest.mock("@/lib/rateLimit", () => ({}))

const normaliza = emailField()

describe("forgotPasswordEmailKey", () => {
  it.each([
    ["joao@exemplo.com"],
    ["JOAO@EXEMPLO.COM"],
    ["Joao@Exemplo.com"],
    ["joao@exemplo.com "],
    [" joao@exemplo.com"],
    ["  Joao@Exemplo.COM \t"],
    ["joao@exemplo.com\n"],
  ])("variação %j vira a mesma chave normalizada", (variacao) => {
    const normalizado = normaliza.parse(variacao)
    expect(normalizado).toBe("joao@exemplo.com")
    expect(forgotPasswordEmailKey(variacao)).toBe(`forgot:email:${normalizado}`)
  })

  it.each([[""], ["   "], ["nao-e-email"], [null], [undefined]])(
    "valor inválido %j não gera chave",
    (invalido) => {
      expect(forgotPasswordEmailKey(invalido)).toBeNull()
    },
  )

  it("prefixo é forgot:email:, não login:email:", () => {
    const chave = forgotPasswordEmailKey("x@y.com")
    expect(chave).toMatch(/^forgot:email:/)
    expect(chave).not.toMatch(/^login:email:/)
  })
})
