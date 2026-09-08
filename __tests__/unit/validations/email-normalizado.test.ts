/** @jest-environment node */
/**
 * O e-mail é normalizado na FRONTEIRA do servidor, não em cada cliente.
 *
 * 🪤 Gravação e leitura discordavam: o cadastro guardava o endereço como veio
 * (`app/api/auth/register/route.ts` → `email: d.email`) e o `authorize()` do
 * NextAuth lia `credentials` cru, fazendo só `.toLowerCase()` — sem `.trim()`.
 * Duas consequências: uma conta criada como `Roberto@Gmail.com` por qualquer
 * cliente que não normalizasse nunca seria encontrada, e um e-mail colado do
 * gerenciador de senhas com espaço à direita já falhava HOJE, no login web,
 * com "credencial inválida" para a senha correta.
 *
 * 🪤 `LoginSchema` existia e NÃO era usado por ninguém. Um teste sobre ele era
 * verde sobre código morto — por isso o caso do espaço à direita é afirmado
 * aqui: é o que prova que o schema entrou no caminho de execução.
 */
import { RegisterSchema, RegisterMinimalSchema, LoginSchema } from "@/lib/validations/auth"

const SUJO  = "  Roberto.Epifanio@Gmail.COM  "
const LIMPO = "roberto.epifanio@gmail.com"

const REGISTER_MIN = {
  name:           "Roberto Epifanio",
  password:       "Senha1234",
  consentVersion: "v1.0",
  city:           "Recife",
  state:          "PE",
}

describe("normalização de e-mail nos schemas de auth", () => {
  it("cadastro mínimo: minúsculas e sem espaços — é o que vai para o banco", () => {
    const r = RegisterMinimalSchema.safeParse({ ...REGISTER_MIN, email: SUJO })

    expect(r.success).toBe(true)
    if (!r.success) throw new Error("schema recusou o payload — o teste abaixo não valeria nada")
    expect(r.data.email).toBe(LIMPO)
  })

  it("login aceita e NORMALIZA o e-mail com espaço, em vez de recusar", () => {
    // Era o caso vivo: `authorize()` fazia `.toLowerCase()` sem `.trim()`.
    const r = LoginSchema.safeParse({ email: " roberto@gmail.com ", password: "x" })

    expect(r.success).toBe(true)
    if (!r.success) throw new Error("schema recusou o payload")
    expect(r.data.email).toBe("roberto@gmail.com")
  })

  it("cadastro e login produzem a MESMA chave — é isso que faz o login funcionar", () => {
    const cadastro = RegisterMinimalSchema.safeParse({ ...REGISTER_MIN, email: "Roberto@Gmail.com" })
    const login    = LoginSchema.safeParse({ email: " roberto@GMAIL.com ", password: "x" })

    expect(cadastro.success).toBe(true)
    expect(login.success).toBe(true)
    if (!cadastro.success || !login.success) throw new Error("schema recusou o payload")
    expect(cadastro.data.email).toBe(login.data.email)
  })

  it("continua recusando e-mail inválido — normalizar não é validar", () => {
    expect(RegisterMinimalSchema.safeParse({ ...REGISTER_MIN, email: "NÃO É EMAIL" }).success).toBe(false)
    expect(LoginSchema.safeParse({ email: "@", password: "x" }).success).toBe(false)
  })

  it("o schema completo de cadastro normaliza pelo mesmo caminho", () => {
    // 🪤 O campo é `cpf`, não `document`. Com o nome errado o zod descarta a
    // chave, o `.refine` de "CPF obrigatório" reprova, e um `if (r.success)`
    // sem `else` deixaria o teste passar com ZERO asserções executadas — que
    // foi exatamente o que aconteceu na primeira versão deste arquivo.
    const r = RegisterSchema.safeParse({
      ...REGISTER_MIN,
      email:           SUJO,
      confirmPassword: "Senha1234",
      phone:           "+5581999998888",
      userType:        "PF",
      cpf:             "11144477735",
      acceptedTerms:   true,
    })

    expect(r.success).toBe(true)
    if (!r.success) throw new Error(JSON.stringify(r.error.issues))
    expect(r.data.email).toBe(LIMPO)
  })
})
