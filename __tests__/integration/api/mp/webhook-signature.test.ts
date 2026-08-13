/** @jest-environment node */
/**
 * Segurança do webhook do Mercado Pago — validação de assinatura.
 *
 * Arquivo fonte: app/api/mp/webhook/route.ts
 *
 * Por que este teste existe: a validação de assinatura era CONDICIONAL — sem
 * `MP_WEBHOOK_SECRET` o handler pulava a checagem e seguia processando, com um
 * `console.warn` como único sinal. O desenho de dois tempos (consultar o
 * pagamento real no MP antes de marcar pago) limita o estrago, mas não é
 * autorização: a rota aceitava requisição de qualquer origem, gravava na fila
 * de eventos e disparava consulta usando o token do vendedor que o CHAMADOR
 * indicava no payload.
 *
 * O ponto sensível é o modo de operação: sandbox pode pular, credencial real
 * não pode. A chave é o prefixo do próprio `MP_ACCESS_TOKEN` (`TEST-`), não
 * `VERCEL_ENV` — staging também deploya como "production" no Vercel.
 *
 * `@jest-environment node`: a rota usa Request/Response da Web API, que o jsdom
 * não fornece.
 */
import crypto from "crypto"
import { POST } from "@/app/api/mp/webhook/route"

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockIsActive          = jest.fn()
const mockGetPaymentClient  = jest.fn()
const mockMarkRentalPaid    = jest.fn()
const mockQueueFindUnique   = jest.fn()
const mockQueueUpsert       = jest.fn()
const mockQueueUpdate       = jest.fn()
const mockAcctFindUnique    = jest.fn()

jest.mock("@/lib/mercadopago", () => ({
  isMercadoPagoActive:       () => mockIsActive(),
  getPaymentClient:          (...a: unknown[]) => mockGetPaymentClient(...a),
  refreshSellerToken:        jest.fn(),
  sandboxSellerTokenOverride: () => null,
}))

jest.mock("@/lib/prisma", () => ({
  prisma: {
    mercadoPagoEventQueue: {
      findUnique: (...a: unknown[]) => mockQueueFindUnique(...a),
      upsert:     (...a: unknown[]) => mockQueueUpsert(...a),
      update:     (...a: unknown[]) => mockQueueUpdate(...a),
    },
    ownerPaymentAccount: {
      findUnique: (...a: unknown[]) => mockAcctFindUnique(...a),
      update:     jest.fn(),
    },
  },
}))

jest.mock("@/lib/crypto", () => ({
  encryptPII: (s: string) => s,
  decryptPII: (s: string) => s,
}))

jest.mock("@/lib/payments/mark-booking-paid", () => ({
  markRentalPaid: (...a: unknown[]) => mockMarkRentalPaid(...a),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SECRET  = "segredo-de-webhook-para-teste"
const DATA_ID = "123456789"
const URL_WH  = "https://staging.shareo.com.br/api/mp/webhook"

/** Reproduz o manifest que o MP assina: id;request-id;ts. */
function assinar(dataId: string, requestId: string, ts: string, secret = SECRET) {
  const id = /^[a-zA-Z0-9]+$/.test(dataId) ? dataId.toLowerCase() : dataId
  const manifest = `id:${id};request-id:${requestId};ts:${ts};`
  return crypto.createHmac("sha256", secret).update(manifest).digest("hex")
}

function requisicao(opts: { assinatura?: string; requestId?: string; ts?: string } = {}) {
  const headers: Record<string, string> = { "content-type": "application/json" }
  if (opts.assinatura) headers["x-signature"] = `ts=${opts.ts ?? "1700000000"},v1=${opts.assinatura}`
  if (opts.requestId)  headers["x-request-id"] = opts.requestId
  return new Request(URL_WH, {
    method: "POST",
    headers,
    body: JSON.stringify({ id: 987, type: "payment", action: "payment.updated", data: { id: DATA_ID } }),
  })
}

const envOriginal = { ...process.env }

beforeEach(() => {
  jest.clearAllMocks()
  process.env = { ...envOriginal }
  mockIsActive.mockResolvedValue(true)
  mockQueueFindUnique.mockResolvedValue(null)
  mockQueueUpsert.mockResolvedValue({})
  mockQueueUpdate.mockResolvedValue({})
  // Pagamento não aprovado: isola o teste na camada de assinatura.
  mockGetPaymentClient.mockReturnValue({ get: jest.fn().mockResolvedValue({ id: DATA_ID, status: "pending" }) })
  jest.spyOn(console, "warn").mockImplementation(() => {})
  jest.spyOn(console, "error").mockImplementation(() => {})
})

afterAll(() => { process.env = envOriginal })

// ---------------------------------------------------------------------------

describe("POST /api/mp/webhook — gating por flag", () => {
  it("404 quando o Mercado Pago está desligado, sem tocar em nada", async () => {
    mockIsActive.mockResolvedValue(false)
    const res = await POST(requisicao())
    expect(res.status).toBe(404)
    expect(mockQueueUpsert).not.toHaveBeenCalled()
    expect(mockMarkRentalPaid).not.toHaveBeenCalled()
  })
})

describe("POST /api/mp/webhook — credencial REAL sem MP_WEBHOOK_SECRET", () => {
  beforeEach(() => {
    process.env.MP_ACCESS_TOKEN = "APP_USR-token-de-producao"
    delete process.env.MP_WEBHOOK_SECRET
  })

  it("RECUSA com 503 em vez de processar — o defeito que este PR corrige", async () => {
    const res = await POST(requisicao())
    expect(res.status).toBe(503)
    await expect(res.json()).resolves.toMatchObject({ error: expect.stringMatching(/signature/i) })
  })

  it("não grava na fila de eventos nem consulta o MP", async () => {
    await POST(requisicao())
    expect(mockQueueUpsert).not.toHaveBeenCalled()
    expect(mockGetPaymentClient).not.toHaveBeenCalled()
    expect(mockMarkRentalPaid).not.toHaveBeenCalled()
  })

  it("recusa mesmo com assinatura presente — sem secret não há o que verificar", async () => {
    const res = await POST(requisicao({ assinatura: "deadbeef", requestId: "req-1" }))
    expect(res.status).toBe(503)
  })
})

describe("POST /api/mp/webhook — sandbox (token TEST-) sem secret", () => {
  beforeEach(() => {
    process.env.MP_ACCESS_TOKEN = "TEST-token-de-sandbox"
    delete process.env.MP_WEBHOOK_SECRET
  })

  it("segue processando: sandbox pode pular a assinatura", async () => {
    const res = await POST(requisicao())
    expect(res.status).toBe(200)
    expect(mockQueueUpsert).toHaveBeenCalled()
  })
})

describe("POST /api/mp/webhook — com MP_WEBHOOK_SECRET configurado", () => {
  beforeEach(() => {
    process.env.MP_ACCESS_TOKEN   = "APP_USR-token-de-producao"
    process.env.MP_WEBHOOK_SECRET = SECRET
  })

  it("401 sem header x-signature", async () => {
    const res = await POST(requisicao())
    expect(res.status).toBe(401)
    expect(mockQueueUpsert).not.toHaveBeenCalled()
  })

  it("401 com assinatura forjada", async () => {
    const res = await POST(requisicao({ assinatura: "f".repeat(64), requestId: "req-1" }))
    expect(res.status).toBe(401)
    expect(mockMarkRentalPaid).not.toHaveBeenCalled()
  })

  it("401 quando a assinatura é válida para OUTRO request-id (replay cruzado)", async () => {
    const boa = assinar(DATA_ID, "req-original", "1700000000")
    const res = await POST(requisicao({ assinatura: boa, requestId: "req-diferente", ts: "1700000000" }))
    expect(res.status).toBe(401)
  })

  it("401 quando a assinatura foi feita com outro secret", async () => {
    const errada = assinar(DATA_ID, "req-1", "1700000000", "secret-do-atacante")
    const res = await POST(requisicao({ assinatura: errada, requestId: "req-1", ts: "1700000000" }))
    expect(res.status).toBe(401)
  })

  it("aceita e processa com assinatura válida", async () => {
    const boa = assinar(DATA_ID, "req-1", "1700000000")
    const res = await POST(requisicao({ assinatura: boa, requestId: "req-1", ts: "1700000000" }))
    expect(res.status).toBe(200)
    expect(mockQueueUpsert).toHaveBeenCalled()
  })

  it("marca a reserva paga só quando o MP responde approved", async () => {
    mockGetPaymentClient.mockReturnValue({
      get: jest.fn().mockResolvedValue({ id: DATA_ID, status: "approved", external_reference: "booking-abc" }),
    })
    const boa = assinar(DATA_ID, "req-1", "1700000000")
    await POST(requisicao({ assinatura: boa, requestId: "req-1", ts: "1700000000" }))
    expect(mockMarkRentalPaid).toHaveBeenCalledWith(
      expect.objectContaining({ bookingId: "booking-abc" }),
    )
  })

  it("NÃO confia no payload: status vem da consulta ao MP, não do corpo da requisição", async () => {
    // Corpo diz "approved"; a consulta ao MP diz "rejected". Vence o MP.
    mockGetPaymentClient.mockReturnValue({
      get: jest.fn().mockResolvedValue({ id: DATA_ID, status: "rejected", external_reference: "booking-abc" }),
    })
    const boa = assinar(DATA_ID, "req-1", "1700000000")
    const req = new Request(URL_WH, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-signature":  `ts=1700000000,v1=${boa}`,
        "x-request-id": "req-1",
      },
      body: JSON.stringify({
        id: 987, type: "payment", data: { id: DATA_ID },
        status: "approved", external_reference: "booking-abc", // ← mentira do chamador
      }),
    })
    await POST(req)
    expect(mockMarkRentalPaid).not.toHaveBeenCalled()
  })
})
