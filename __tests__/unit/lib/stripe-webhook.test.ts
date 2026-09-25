/** @jest-environment node */
/**
 * Testes de verifyStripeWebhookRequest — lib/payments/stripe-webhook.ts
 *
 * Cobre:
 *   - secret único (comportamento original)
 *   - lista de secrets separada por vírgula (migração de Event Destination)
 *   - ausência de assinatura → 400
 *   - env var não configurada → 500
 *   - nenhum secret válido → 400
 *   - nunca loga o valor do secret (segurança)
 *   - erros que não são StripeSignatureVerificationError são relançados
 */
import Stripe from "stripe"
import { verifyStripeWebhookRequest } from "@/lib/payments/stripe-webhook"

// Helper que monta um Request com os headers necessários
function makeRequest(body: string, signature: string | null): Request {
  const headers: Record<string, string> = { "content-type": "application/json" }
  if (signature !== null) headers["stripe-signature"] = signature
  return new Request("https://app.shareo.com.br/api/webhooks/stripe-connect", {
    method: "POST",
    body,
    headers,
  })
}

// Verifica fake que aceita só "secret-correto".
// Lança StripeSignatureVerificationError para simular falha real do SDK.
const verify = jest.fn((body: string, sig: string, secret: string): string => {
  if (secret !== "whsec_correto") {
    throw new Stripe.errors.StripeSignatureVerificationError({
      message: "No signatures found matching the expected signature for payload",
      detail:  "No matching signature",
    })
  }
  return `verified:${body}`
})

beforeEach(() => {
  jest.clearAllMocks()
  delete process.env["STRIPE_CONNECT_WEBHOOK_SECRET"]
  jest.spyOn(console, "error").mockImplementation(() => {})
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe("verifyStripeWebhookRequest — secret único", () => {
  it("verifica com sucesso quando secret está correto", async () => {
    process.env["STRIPE_CONNECT_WEBHOOK_SECRET"] = "whsec_correto"
    const req    = makeRequest('{"type":"ping"}', "t=1,v1=abc")
    const result = await verifyStripeWebhookRequest(req, {
      logPrefix:    "[teste]",
      secretEnvVar: "STRIPE_CONNECT_WEBHOOK_SECRET",
      verify,
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.payload).toBe('verified:{"type":"ping"}')
    expect(verify).toHaveBeenCalledTimes(1)
  })

  it("retorna 400 quando a verificação falha com secret errado", async () => {
    process.env["STRIPE_CONNECT_WEBHOOK_SECRET"] = "whsec_errado"
    const req    = makeRequest("{}", "t=1,v1=abc")
    const result = await verifyStripeWebhookRequest(req, {
      logPrefix:    "[teste]",
      secretEnvVar: "STRIPE_CONNECT_WEBHOOK_SECRET",
      verify,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.response.status).toBe(400)
  })

  it("retorna 400 quando stripe-signature está ausente", async () => {
    process.env["STRIPE_CONNECT_WEBHOOK_SECRET"] = "whsec_correto"
    const req    = makeRequest("{}", null)
    const result = await verifyStripeWebhookRequest(req, {
      logPrefix:    "[teste]",
      secretEnvVar: "STRIPE_CONNECT_WEBHOOK_SECRET",
      verify,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.response.status).toBe(400)
    expect(verify).not.toHaveBeenCalled()
  })

  it("retorna 500 quando a env var não está configurada", async () => {
    // STRIPE_CONNECT_WEBHOOK_SECRET deliberadamente não definido
    const req    = makeRequest("{}", "t=1,v1=abc")
    const result = await verifyStripeWebhookRequest(req, {
      logPrefix:    "[teste]",
      secretEnvVar: "STRIPE_CONNECT_WEBHOOK_SECRET",
      verify,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.response.status).toBe(500)
    expect(verify).not.toHaveBeenCalled()
  })
})

describe("verifyStripeWebhookRequest — lista de secrets (migração de Event Destination)", () => {
  it("aceita quando o segundo secret da lista é válido", async () => {
    // Cenário: destino antigo (whsec_antigo) coexiste com novo (whsec_correto)
    process.env["STRIPE_CONNECT_WEBHOOK_SECRET"] = "whsec_antigo,whsec_correto"
    const req    = makeRequest('{"type":"ping"}', "t=1,v1=abc")
    const result = await verifyStripeWebhookRequest(req, {
      logPrefix:    "[teste]",
      secretEnvVar: "STRIPE_CONNECT_WEBHOOK_SECRET",
      verify,
    })
    expect(result.ok).toBe(true)
    // A função tenta os dois secrets — o segundo deveria ter validado
    expect(verify).toHaveBeenCalledTimes(2)
  })

  it("aceita quando o primeiro secret da lista é válido", async () => {
    process.env["STRIPE_CONNECT_WEBHOOK_SECRET"] = "whsec_correto,whsec_antigo"
    const req    = makeRequest('{"type":"ping"}', "t=1,v1=abc")
    const result = await verifyStripeWebhookRequest(req, {
      logPrefix:    "[teste]",
      secretEnvVar: "STRIPE_CONNECT_WEBHOOK_SECRET",
      verify,
    })
    expect(result.ok).toBe(true)
    // Parou no primeiro — não precisa tentar o segundo
    expect(verify).toHaveBeenCalledTimes(1)
  })

  it("retorna 400 quando nenhum secret da lista é válido", async () => {
    process.env["STRIPE_CONNECT_WEBHOOK_SECRET"] = "whsec_errado1,whsec_errado2"
    const req    = makeRequest("{}", "t=1,v1=abc")
    const result = await verifyStripeWebhookRequest(req, {
      logPrefix:    "[teste]",
      secretEnvVar: "STRIPE_CONNECT_WEBHOOK_SECRET",
      verify,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.response.status).toBe(400)
    expect(verify).toHaveBeenCalledTimes(2)
  })

  it("ignora entradas vazias geradas por vírgulas extras", async () => {
    // Ex.: ",whsec_correto," (espaços ou vírgulas duplicadas não devem travar)
    process.env["STRIPE_CONNECT_WEBHOOK_SECRET"] = ",whsec_correto,"
    const req    = makeRequest('{"type":"ping"}', "t=1,v1=abc")
    const result = await verifyStripeWebhookRequest(req, {
      logPrefix:    "[teste]",
      secretEnvVar: "STRIPE_CONNECT_WEBHOOK_SECRET",
      verify,
    })
    expect(result.ok).toBe(true)
  })
})

describe("verifyStripeWebhookRequest — erros não-assinatura são relançados", () => {
  it("relança erros que não são StripeSignatureVerificationError", async () => {
    const errInesperado = new Error("Erro inesperado de biblioteca")
    process.env["STRIPE_CONNECT_WEBHOOK_SECRET"] = "whsec_qualquer"
    const req = makeRequest("{}", "t=1,v1=abc")
    const verifyQuebrado = jest.fn(() => { throw errInesperado })

    await expect(
      verifyStripeWebhookRequest(req, {
        logPrefix:    "[teste]",
        secretEnvVar: "STRIPE_CONNECT_WEBHOOK_SECRET",
        verify:       verifyQuebrado,
      }),
    ).rejects.toThrow("Erro inesperado de biblioteca")
  })
})

describe("verifyStripeWebhookRequest — segurança: não loga secrets", () => {
  it("não inclui o valor do secret nas mensagens de erro", async () => {
    process.env["STRIPE_CONNECT_WEBHOOK_SECRET"] = "whsec_secreto_nao_logar"
    const req    = makeRequest("{}", "t=1,v1=abc")
    await verifyStripeWebhookRequest(req, {
      logPrefix:    "[teste]",
      secretEnvVar: "STRIPE_CONNECT_WEBHOOK_SECRET",
      verify,
    })
    const logCalls = (console.error as jest.Mock).mock.calls.flat().join(" ")
    expect(logCalls).not.toContain("whsec_secreto_nao_logar")
  })
})
