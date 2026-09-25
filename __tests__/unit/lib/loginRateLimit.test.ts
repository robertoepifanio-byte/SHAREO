/**
 * @jest-environment node
 *
 * Chave do limite por e-mail do login. Tem de seguir o mesmo schema de
 * normalização que o login usa (`LoginSchema`: trim + minúsculas) — senão cada
 * variação do mesmo e-mail ganha uma cota própria de tentativas.
 */

import { loginEmailKey } from "@/lib/loginRateLimit"
import { LoginSchema } from "@/lib/validations/auth"

// A chave não usa o limitador; o mock evita carregar os pacotes ESM do Upstash.
jest.mock("@/lib/rateLimit", () => ({}))

describe("loginEmailKey", () => {
  it.each([
    ["maria@exemplo.com"],
    ["MARIA@EXEMPLO.COM"],
    ["Maria@Exemplo.com"],
    ["maria@exemplo.com "],
    [" maria@exemplo.com"],
    ["  Maria@Exemplo.COM \t"],
    ["maria@exemplo.com\n"],
  ])("variação %j vira a chave do e-mail que o login consulta (LoginSchema)", (variacao) => {
    const consultado = LoginSchema.parse({ email: variacao, password: "x" }).email
    expect(consultado).toBe("maria@exemplo.com")
    expect(loginEmailKey(variacao)).toBe(`login:email:${consultado}`)
  })

  it.each([[""], ["   "], ["nao-e-email"], [null]])(
    "valor inválido %j não gera chave (o login já o recusa)",
    (invalido) => {
      expect(loginEmailKey(invalido)).toBeNull()
    },
  )
})
