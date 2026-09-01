/**
 * Reemissão da cobrança da taxa de atraso.
 *
 * O defeito que isto tranca (diagnóstico de 01/09/2026 no staging): das 5
 * multas efetivamente cobradas, as 5 sessões de checkout expiraram sem
 * pagamento. A sessão vale 24h — teto da Stripe — e nada a reemitia, porque o
 * cron só cobrava quando `lateFeeAmount` estava vazio e ele mesmo acabara de
 * preencher esse campo. A dívida virava incobrável, e o lembrete diário de
 * atraso continuava saindo sem link de pagamento.
 */
import { emitirCobrancaTaxaAtraso, precisaCobrar, temCobrancaViva, taxaDeAtrasoQuitada } from "@/lib/lateFee"

const mockBookingUpdate = jest.fn()
const mockSessionCreate = jest.fn()
const mockSendEmail     = jest.fn()

jest.mock("@/lib/prisma", () => ({
  prisma: { booking: { update: (...a: unknown[]) => mockBookingUpdate(...a) } },
}))
jest.mock("@/lib/stripe", () => ({
  getStripe: () => ({ checkout: { sessions: { create: (...a: unknown[]) => mockSessionCreate(...a) } } }),
}))
jest.mock("@/lib/email", () => ({
  sendLateFeeEmail: (...a: unknown[]) => mockSendEmail(...a),
}))
jest.mock("@/lib/app-url", () => ({ APP_URL: "https://staging.shareo.com.br" }))

const AGORA   = new Date("2026-09-01T12:00:00Z")
const ONTEM   = new Date("2026-08-31T12:00:00Z")
const AMANHA  = new Date("2026-09-02T12:00:00Z")

function makeBooking(over: Partial<{
  lateFeeAmount: number | null
  lateFeePaymentIntentId: string | null
  lateFeeSessionExpiresAt: Date | null
}> = {}) {
  return {
    id: "bk-1",
    lateFeeAmount:           over.lateFeeAmount           === undefined ? null : over.lateFeeAmount,
    lateFeePaymentIntentId:  over.lateFeePaymentIntentId  === undefined ? null : over.lateFeePaymentIntentId,
    lateFeeSessionExpiresAt: over.lateFeeSessionExpiresAt === undefined ? null : over.lateFeeSessionExpiresAt,
    borrower: { email: "loc@ex.com", name: "Locatário Teste" },
    item:     { images: [{ url: "https://img/1.jpg" }] },
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockSessionCreate.mockResolvedValue({ id: "cs_novo", url: "https://checkout/novo" })
  mockBookingUpdate.mockResolvedValue({})
  mockSendEmail.mockResolvedValue(undefined)
})

describe("precisaCobrar", () => {
  it("SIM quando a multa nunca foi cobrada", () => {
    expect(precisaCobrar(makeBooking(), AGORA)).toBe(true)
  })

  it("🪤 SIM quando a cobrança anterior EXPIROU — o caso dos 5 do staging", () => {
    const b = makeBooking({ lateFeeAmount: 750, lateFeeSessionExpiresAt: ONTEM })
    expect(precisaCobrar(b, AGORA)).toBe(true)
  })

  it("NÃO enquanto a cobrança está viva — não duplicar link", () => {
    const b = makeBooking({ lateFeeAmount: 750, lateFeeSessionExpiresAt: AMANHA })
    expect(precisaCobrar(b, AGORA)).toBe(false)
  })

  it("NÃO depois de paga, mesmo com a sessão vencida", () => {
    const b = makeBooking({ lateFeeAmount: 750, lateFeePaymentIntentId: "pi_multa", lateFeeSessionExpiresAt: ONTEM })
    expect(precisaCobrar(b, AGORA)).toBe(false)
    expect(taxaDeAtrasoQuitada(b)).toBe(true)
  })

  it("sessão expirada é o mesmo que sessão nenhuma", () => {
    expect(temCobrancaViva({ lateFeeSessionExpiresAt: ONTEM }, AGORA)).toBe(false)
    expect(temCobrancaViva({ lateFeeSessionExpiresAt: null },  AGORA)).toBe(false)
    expect(temCobrancaViva({ lateFeeSessionExpiresAt: AMANHA }, AGORA)).toBe(true)
  })
})

describe("emitirCobrancaTaxaAtraso", () => {
  it("primeira emissão grava valor, sessão e validade", async () => {
    const r = await emitirCobrancaTaxaAtraso(makeBooking(), "Furadeira", 750, "1 dia em atraso")

    expect(r).toMatchObject({ emitida: true, reemissao: false, valor: 750 })
    const { data } = mockBookingUpdate.mock.calls[0][0] as { data: Record<string, unknown> }
    expect(data.lateFeeAmount).toBe(750)
    expect(data.lateFeeSessionId).toBe("cs_novo")
    expect(data.lateFeeSessionExpiresAt).toBeInstanceOf(Date)
    expect(mockSendEmail).toHaveBeenCalled()
  })

  it("🪤 grava DEPOIS de a sessão existir — falha da Stripe não queima a cobrança", async () => {
    mockSessionCreate.mockRejectedValue(new Error("Stripe fora do ar"))

    await expect(
      emitirCobrancaTaxaAtraso(makeBooking(), "Furadeira", 750, "1 dia em atraso"),
    ).rejects.toThrow("Stripe fora do ar")

    // A ordem antiga gravava `lateFeeAmount` PRIMEIRO: a reserva ficava com
    // multa registrada e sem cobrança, e o cron nunca mais tentava porque o
    // campo tinha deixado de ser nulo.
    expect(mockBookingUpdate).not.toHaveBeenCalled()
  })

  it("reemissão mantém o valor já comunicado, não recalcula", async () => {
    const b = makeBooking({ lateFeeAmount: 750, lateFeeSessionExpiresAt: ONTEM })

    // 5000 seria o valor "de primeira emissão" com mais dias de atraso.
    const r = await emitirCobrancaTaxaAtraso(b, "Furadeira", 5000, "7 dias em atraso")

    expect(r).toMatchObject({ emitida: true, reemissao: true, valor: 750 })
    const args = mockSessionCreate.mock.calls[0][0] as { line_items: { price_data: { unit_amount: number } }[] }
    // Cobrar mais do que o primeiro e-mail dizia seria mudar a dívida sem aviso.
    expect(args.line_items[0].price_data.unit_amount).toBe(750)
  })

  it("não emite se já quitada", async () => {
    const b = makeBooking({ lateFeeAmount: 750, lateFeePaymentIntentId: "pi_multa" })

    const r = await emitirCobrancaTaxaAtraso(b, "Furadeira", 750, "1 dia em atraso")

    expect(r).toEqual({ emitida: false, motivo: "JA_QUITADA" })
    expect(mockSessionCreate).not.toHaveBeenCalled()
  })

  it("não emite enquanto há cobrança viva", async () => {
    const b = makeBooking({ lateFeeAmount: 750, lateFeeSessionExpiresAt: new Date(Date.now() + 3600_000) })

    const r = await emitirCobrancaTaxaAtraso(b, "Furadeira", 750, "1 dia em atraso")

    expect(r).toEqual({ emitida: false, motivo: "COBRANCA_VIVA" })
    expect(mockSessionCreate).not.toHaveBeenCalled()
  })

  it("a sessão expira em 24h — teto da Stripe", async () => {
    await emitirCobrancaTaxaAtraso(makeBooking(), "Furadeira", 750, "1 dia em atraso")

    const args = mockSessionCreate.mock.calls[0][0] as { expires_at: number }
    const horas = (args.expires_at * 1000 - Date.now()) / 3_600_000
    expect(horas).toBeGreaterThan(23.9)
    expect(horas).toBeLessThanOrEqual(24)
  })
})
