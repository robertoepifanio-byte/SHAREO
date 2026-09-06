/** @jest-environment node */
/**
 * Fixa o CONTRATO dos tokens de descadastro.
 *
 * Existe por causa de uma refatoração: a mecânica do HMAC saiu de
 * `lib/founders-unsubscribe.ts` para `lib/unsubscribe-token.ts`, compartilhada com o
 * descadastro dos e-mails de reengajamento. O token é derivado, não guardado —
 * então qualquer mudança no payload assinado (ordem, separador, normalização,
 * propósito) invalida em silêncio TODOS os links de descadastro que já saíram.
 * A campanha de Fundadores está no ar desde 01/09/2026 e esses links estão em
 * caixas de entrada reais.
 *
 * Por isso o teste recalcula o HMAC do zero, com `crypto` puro, em vez de
 * comparar duas chamadas da mesma função — que continuariam concordando entre
 * si depois de uma mudança de formato.
 */
import crypto from "crypto"

process.env.AUTH_SECRET = "segredo-de-teste-nao-usar-em-producao"

import { unsubscribeToken, verifyUnsubscribeToken, unsubscribeUrl } from "@/lib/founders-unsubscribe"
import {
  engagementUnsubscribeToken,
  verifyEngagementUnsubscribeToken,
  engagementUnsubscribeUrl,
} from "@/lib/engagement-unsubscribe"

const EMAIL = "Roberto.Epifanio@Example.COM"

/** O formato histórico: HMAC-SHA256 de `${purpose}:${email normalizado}`. */
function expectedToken(purpose: string, email: string) {
  return crypto
    .createHmac("sha256", process.env.AUTH_SECRET!)
    .update(`${purpose}:${email.trim().toLowerCase()}`)
    .digest("hex")
}

describe("token de descadastro — Fundadores", () => {
  it("mantém o formato que os links já enviados usam", () => {
    expect(unsubscribeToken(EMAIL)).toBe(expectedToken("founder-unsubscribe-v1", EMAIL))
  })

  it("normaliza caixa e espaços — o mesmo e-mail dá o mesmo token", () => {
    expect(unsubscribeToken("  roberto.epifanio@example.com  ")).toBe(unsubscribeToken(EMAIL))
  })

  it("aceita o próprio token e recusa o de outro e-mail", () => {
    expect(verifyUnsubscribeToken(EMAIL, unsubscribeToken(EMAIL))).toBe(true)
    expect(verifyUnsubscribeToken(EMAIL, unsubscribeToken("outro@example.com"))).toBe(false)
    expect(verifyUnsubscribeToken(EMAIL, "")).toBe(false)
  })
})

describe("token de descadastro — reengajamento", () => {
  it("usa propósito próprio", () => {
    expect(engagementUnsubscribeToken(EMAIL)).toBe(expectedToken("engagement-unsubscribe-v1", EMAIL))
  })

  it("um token não vale na outra lista — são bases legais diferentes", () => {
    expect(verifyEngagementUnsubscribeToken(EMAIL, unsubscribeToken(EMAIL))).toBe(false)
    expect(verifyUnsubscribeToken(EMAIL, engagementUnsubscribeToken(EMAIL))).toBe(false)
  })
})

describe("URL de descadastro", () => {
  it("aponta cada lista para a sua rota, com o e-mail escapado", () => {
    expect(unsubscribeUrl("https://shareo.com.br", EMAIL)).toContain(
      "/api/founders/unsubscribe?email=roberto.epifanio%40example.com&token=",
    )
    expect(engagementUnsubscribeUrl("https://shareo.com.br", EMAIL)).toContain(
      "/api/engagement/unsubscribe?email=roberto.epifanio%40example.com&token=",
    )
  })
})
