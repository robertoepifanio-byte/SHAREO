// Fonte: apps/mobile/lib/forms.ts (espelho de emailField() em lib/validations/auth.ts do site)
//
// EVAL-P1-06 — isValidEmail usa a regex do `.email()` do zod copiada, para não
// trazer o zod inteiro ao bundle. Este teste é o que impede a cópia de divergir:
// cada caso é conferido CONTRA o zod (dependência só de teste aqui).

import { z } from "zod"
import { isValidEmail } from "../forms"

// Mesmo encadeamento do emailField() do servidor.
const servidor = z.string().trim().email()

const INVALIDOS = ["", "a@", "@b.com", "a@b", "a b@c.com", ".a@b.com", "a..b@c.com", "a@b.c", "a@-b.com", "a.@b.com"]
const VALIDOS   = ["ana@exemplo.com", " ana@exemplo.com ", "Ana.Souza+x@Exemplo.com.br", "a_b-c'd@sub.dominio.io"]

describe("isValidEmail — mesmo veredito do emailField() do servidor", () => {
  it.each(INVALIDOS)("recusa %p", (v) => {
    expect(isValidEmail(v)).toBe(false)
  })

  it.each(VALIDOS)("aceita %p", (v) => {
    expect(isValidEmail(v)).toBe(true)
  })

  it.each([...INVALIDOS, ...VALIDOS])("concorda com o zod em %p", (v) => {
    expect(isValidEmail(v)).toBe(servidor.safeParse(v).success)
  })
})
