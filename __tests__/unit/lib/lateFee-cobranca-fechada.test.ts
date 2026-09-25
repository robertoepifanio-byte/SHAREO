/** @jest-environment node */
/**
 * Taxa de atraso × interruptor de cobrança real (go-live 01/10/2026).
 *
 * `emitirCobrancaTaxaAtraso` é o ÚNICO ponto que cria a Checkout Session da multa
 * (cron de lembretes, nos dois caminhos, e o recálculo manual do admin). Com chave
 * Stripe LIVE e sem `billingEnabled`, não pode criar sessão, expirar a anterior,
 * gravar valor nem mandar e-mail com link — e também não é erro: o cron tenta de
 * novo no dia seguinte.
 *
 * A guarda do PROPRIETÁRIO (OWNER_NOT_READY) NÃO vale aqui, de propósito — ver o
 * comentário em lib/lateFee.ts; o último teste deste arquivo fixa essa decisão.
 */
import { emitirCobrancaTaxaAtraso } from "@/lib/lateFee"
import { clearPlatformConfigCache } from "@/lib/platform-config"

const mockBookingUpdate  = jest.fn()
const mockSessionCreate  = jest.fn()
const mockSessionExpire  = jest.fn()
const mockSendEmail      = jest.fn()
const mockConfigFindMany = jest.fn()
const mockAccountFind    = jest.fn()

jest.mock("@/lib/prisma", () => ({
  prisma: {
    booking:             { update:     (...a: unknown[]) => mockBookingUpdate(...a) },
    platformConfig:      { findMany:   (...a: unknown[]) => mockConfigFindMany(...a) },
    ownerPaymentAccount: { findUnique: (...a: unknown[]) => mockAccountFind(...a) },
  },
}))
jest.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    checkout: { sessions: {
      create: (...a: unknown[]) => mockSessionCreate(...a),
      expire: (...a: unknown[]) => mockSessionExpire(...a),
    } },
  }),
}))
jest.mock("@/lib/email", () => ({ sendLateFeeEmail: (...a: unknown[]) => mockSendEmail(...a) }))
jest.mock("@/lib/app-url", () => ({ APP_URL: "https://app.shareo.test" }))

const AGORA  = new Date("2026-10-05T12:00:00Z")
const AMANHA = new Date("2026-10-06T12:00:00Z")

function makeBooking(over: Record<string, unknown> = {}) {
  return {
    id: "bk-1",
    lateFeeAmount: null, lateFeePaymentIntentId: null, lateFeeSessionId: null, lateFeeSessionExpiresAt: null,
    borrower: { email: "loc@ex.com", name: "Loc" },
    item:     { images: [] },
    ...over,
  } as Parameters<typeof emitirCobrancaTaxaAtraso>[0]
}

const CHAVE_ORIGINAL = process.env.STRIPE_SECRET_KEY
const setKey = (v: string) => { process.env.STRIPE_SECRET_KEY = v }
const billing = (v: string | null) =>
  mockConfigFindMany.mockResolvedValue(v === null ? [] : [{ key: "billingEnabled", value: v }])

beforeEach(() => {
  jest.clearAllMocks()
  clearPlatformConfigCache()
  billing(null)
  mockSessionCreate.mockResolvedValue({ id: "cs_novo", url: "https://checkout/novo" })
  mockSessionExpire.mockResolvedValue({})
  mockBookingUpdate.mockResolvedValue({})
  mockSendEmail.mockResolvedValue(undefined)
  mockAccountFind.mockResolvedValue(null) // dono SEM conta: prova que a guarda B não vale aqui
})
afterAll(() => {
  if (CHAVE_ORIGINAL === undefined) delete process.env.STRIPE_SECRET_KEY
  else process.env.STRIPE_SECRET_KEY = CHAVE_ORIGINAL
})

describe("taxa de atraso com a cobrança real fechada", () => {
  it("🪤 chave LIVE sem billingEnabled: COBRANCA_FECHADA — nenhuma sessão, gravação ou e-mail", async () => {
    setKey("sk_live_abc")
    const r = await emitirCobrancaTaxaAtraso(makeBooking(), "Furadeira", 750, 1, AGORA, AGORA)

    expect(r).toEqual({ emitida: false, motivo: "COBRANCA_FECHADA" })
    expect(mockSessionCreate).not.toHaveBeenCalled()
    expect(mockBookingUpdate).not.toHaveBeenCalled()
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it("🪤 fechada, não expira nem a sessão anterior viva (só a reemissão real mexe nela)", async () => {
    setKey("sk_live_abc")
    const b = makeBooking({ lateFeeAmount: 750, lateFeeSessionId: "cs_velha", lateFeeSessionExpiresAt: AMANHA })
    const r = await emitirCobrancaTaxaAtraso(b, "Furadeira", 1500, 2, AGORA, AGORA)

    expect(r).toMatchObject({ emitida: false, motivo: "COBRANCA_FECHADA" })
    expect(mockSessionExpire).not.toHaveBeenCalled()
    expect(mockSessionCreate).not.toHaveBeenCalled()
  })

  it("chave LIVE com billingEnabled=true: emite normalmente", async () => {
    setKey("sk_live_abc"); billing("true")
    const r = await emitirCobrancaTaxaAtraso(makeBooking(), "Furadeira", 750, 1, AGORA, AGORA)
    expect(r).toMatchObject({ emitida: true, valor: 750 })
    expect(mockSessionCreate).toHaveBeenCalledTimes(1)
    expect(mockSendEmail).toHaveBeenCalledTimes(1)
  })

  it("chave de TESTE sem billingEnabled: emite (staging como hoje)", async () => {
    setKey("sk_test_abc")
    const r = await emitirCobrancaTaxaAtraso(makeBooking(), "Furadeira", 750, 1, AGORA, AGORA)
    expect(r).toMatchObject({ emitida: true, valor: 750 })
    expect(mockSessionCreate).toHaveBeenCalledTimes(1)
  })

  it("já quitada continua respondendo JA_QUITADA (a guarda vem depois dos motivos verdadeiros)", async () => {
    setKey("sk_live_abc")
    const r = await emitirCobrancaTaxaAtraso(makeBooking({ lateFeePaymentIntentId: "pi_ok" }), "Furadeira", 750, 1, AGORA, AGORA)
    expect(r).toEqual({ emitida: false, motivo: "JA_QUITADA" })
  })

  it("sem valor continua respondendo SEM_VALOR", async () => {
    setKey("sk_live_abc")
    const r = await emitirCobrancaTaxaAtraso(makeBooking(), "Furadeira", 0, 1, AGORA, AGORA)
    expect(r).toEqual({ emitida: false, motivo: "SEM_VALOR" })
  })

  it("decisão: dono SEM conta de recebimento NÃO bloqueia a multa (a locação já foi paga sob a guarda B)", async () => {
    setKey("sk_live_abc"); billing("true")
    mockAccountFind.mockResolvedValue(null)
    const r = await emitirCobrancaTaxaAtraso(makeBooking(), "Furadeira", 750, 1, AGORA, AGORA)
    expect(r).toMatchObject({ emitida: true })
    expect(mockAccountFind).not.toHaveBeenCalled()
  })
})
