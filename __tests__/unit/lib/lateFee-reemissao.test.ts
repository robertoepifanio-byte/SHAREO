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
import {
  emitirCobrancaTaxaAtraso, precisaCobrar, temCobrancaViva, taxaDeAtrasoQuitada,
  diasDeAtraso, diasParaCalculo, dentroDoCalculoAutomatico, TETO_DIAS_CALCULO_AUTOMATICO,
} from "@/lib/lateFee"

const mockBookingUpdate = jest.fn()
const mockSessionCreate = jest.fn()
const mockSendEmail     = jest.fn()
const mockSessionExpire = jest.fn()

jest.mock("@/lib/prisma", () => ({
  prisma: { booking: { update: (...a: unknown[]) => mockBookingUpdate(...a) } },
}))
jest.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    checkout: { sessions: {
      create: (...a: unknown[]) => mockSessionCreate(...a),
      expire: (...a: unknown[]) => mockSessionExpire(...a),
    } },
  }),
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
  lateFeeSessionId: string | null
  lateFeeSessionExpiresAt: Date | null
}> = {}) {
  return {
    id: "bk-1",
    lateFeeAmount:           over.lateFeeAmount           === undefined ? null : over.lateFeeAmount,
    lateFeeSessionId:        over.lateFeeSessionId        === undefined ? null : over.lateFeeSessionId,
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
  mockSessionExpire.mockResolvedValue({})
})

describe("precisaCobrar", () => {
  it("SIM quando a multa nunca foi cobrada", () => {
    expect(precisaCobrar(makeBooking(), 750, AGORA)).toBe(true)
  })

  it("🪤 SIM quando a cobrança anterior EXPIROU — o caso dos 5 do staging", () => {
    const b = makeBooking({ lateFeeAmount: 750, lateFeeSessionExpiresAt: ONTEM })
    expect(precisaCobrar(b, 750, AGORA)).toBe(true)
  })

  it("SIM quando a cobrança está viva mas o valor MUDOU (mais um dia de atraso)", () => {
    const b = makeBooking({ lateFeeAmount: 750, lateFeeSessionExpiresAt: AMANHA })
    // A multa é recalculada diariamente (decisão de Roberto, 01/09): um link
    // vivo pelo valor de ontem está desatualizado e precisa ser substituído.
    expect(precisaCobrar(b, 1500, AGORA)).toBe(true)
  })

  it("NÃO enquanto a cobrança viva já está pelo valor certo", () => {
    const b = makeBooking({ lateFeeAmount: 750, lateFeeSessionExpiresAt: AMANHA })
    expect(precisaCobrar(b, 750, AGORA)).toBe(false)
  })

  it("NÃO depois de paga, mesmo com a sessão vencida", () => {
    const b = makeBooking({ lateFeeAmount: 750, lateFeePaymentIntentId: "pi_multa", lateFeeSessionExpiresAt: ONTEM })
    expect(precisaCobrar(b, 3000, AGORA)).toBe(false)
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
    const r = await emitirCobrancaTaxaAtraso(makeBooking(), "Furadeira", 750, 1, AGORA)

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
      emitirCobrancaTaxaAtraso(makeBooking(), "Furadeira", 750, 1, AGORA),
    ).rejects.toThrow("Stripe fora do ar")

    // A ordem antiga gravava `lateFeeAmount` PRIMEIRO: a reserva ficava com
    // multa registrada e sem cobrança, e o cron nunca mais tentava porque o
    // campo tinha deixado de ser nulo.
    expect(mockBookingUpdate).not.toHaveBeenCalled()
  })

  it("reemissão cobra o valor RECALCULADO, não o antigo", async () => {
    const b = makeBooking({ lateFeeAmount: 750, lateFeeSessionExpiresAt: ONTEM })

    // 7 dias de atraso: a dívida cresceu desde a primeira cobrança.
    const r = await emitirCobrancaTaxaAtraso(b, "Furadeira", 5250, 7, AGORA)

    expect(r).toMatchObject({ emitida: true, reemissao: true, valor: 5250, anterior: 750 })
    const args = mockSessionCreate.mock.calls[0][0] as { line_items: { price_data: { unit_amount: number } }[] }
    expect(args.line_items[0].price_data.unit_amount).toBe(5250)
    const { data } = mockBookingUpdate.mock.calls[0][0] as { data: Record<string, unknown> }
    expect(data.lateFeeAmount).toBe(5250)
  })

  it("reprecificar EXPIRA a cobrança antiga — dois links vivos deixariam o locatário escolher a dívida", async () => {
    const b = makeBooking({
      lateFeeAmount: 750, lateFeeSessionId: "cs_antigo", lateFeeSessionExpiresAt: AMANHA,
    })

    await emitirCobrancaTaxaAtraso(b, "Furadeira", 1500, 2, AGORA)

    expect(mockSessionExpire).toHaveBeenCalledWith("cs_antigo")
    // ...e a expiração vem ANTES da criação da nova.
    expect(mockSessionExpire.mock.invocationCallOrder[0])
      .toBeLessThan(mockSessionCreate.mock.invocationCallOrder[0])
  })

  it("falha ao expirar a antiga NÃO impede a nova cobrança", async () => {
    mockSessionExpire.mockRejectedValue(new Error("sessão já expirada"))
    const erro = jest.spyOn(console, "error").mockImplementation(() => {})
    const b = makeBooking({
      lateFeeAmount: 750, lateFeeSessionId: "cs_antigo", lateFeeSessionExpiresAt: AMANHA,
    })

    // Ficar sem cobrança nenhuma é pior que ter duas por algumas horas —
    // a antiga morre sozinha em 24h de qualquer forma.
    const r = await emitirCobrancaTaxaAtraso(b, "Furadeira", 1500, 2, AGORA)

    expect(r).toMatchObject({ emitida: true, valor: 1500 })
    erro.mockRestore()
  })

  it("não emite se já quitada", async () => {
    const b = makeBooking({ lateFeeAmount: 750, lateFeePaymentIntentId: "pi_multa" })

    const r = await emitirCobrancaTaxaAtraso(b, "Furadeira", 750, 1, AGORA)

    expect(r).toEqual({ emitida: false, motivo: "JA_QUITADA" })
    expect(mockSessionCreate).not.toHaveBeenCalled()
  })

  it("não emite quando a cobrança viva já está pelo valor certo", async () => {
    const b = makeBooking({ lateFeeAmount: 750, lateFeeSessionExpiresAt: new Date(Date.now() + 3600_000) })

    const r = await emitirCobrancaTaxaAtraso(b, "Furadeira", 750, 1, AGORA)

    expect(r).toEqual({ emitida: false, motivo: "COBRANCA_ATUAL_VIVA" })
    expect(mockSessionCreate).not.toHaveBeenCalled()
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it("a sessão expira em 24h — teto da Stripe", async () => {
    await emitirCobrancaTaxaAtraso(makeBooking(), "Furadeira", 750, 1, AGORA)

    const args = mockSessionCreate.mock.calls[0][0] as { expires_at: number }
    const horas = (args.expires_at * 1000 - Date.now()) / 3_600_000
    expect(horas).toBeGreaterThan(23.9)
    expect(horas).toBeLessThanOrEqual(24)
  })
})

describe("diasDeAtraso — quando a multa PARA de crescer", () => {
  const fim = new Date("2026-08-30T11:32:00Z")

  it("conta os dias corridos até a referência", () => {
    expect(diasDeAtraso(fim, new Date("2026-08-31T09:00:00Z"))).toBe(1)
    expect(diasDeAtraso(fim, new Date("2026-09-04T23:00:00Z"))).toBe(5)
  })

  it("nunca menos de 1 dia", () => {
    expect(diasDeAtraso(fim, new Date("2026-08-30T23:00:00Z"))).toBe(1)
    expect(diasDeAtraso(fim, new Date("2026-08-29T09:00:00Z"))).toBe(1)
  })

  it("usar a devolução como referência CONGELA a dívida", () => {
    const devolvido = new Date("2026-09-01T09:04:00Z")
    // 2 dias, e continua 2 daqui a um mês: passar `hoje` aqui faria a multa
    // de uma locação CONCLUÍDA crescer para sempre enquanto não fosse paga.
    expect(diasDeAtraso(fim, devolvido)).toBe(2)
  })
})

describe("teto de 30 dias do cálculo automático", () => {
  it("o teto é 30 dias", () => {
    expect(TETO_DIAS_CALCULO_AUTOMATICO).toBe(30)
  })

  it("abaixo do teto, cobra os dias reais", () => {
    expect(diasParaCalculo(1)).toBe(1)
    expect(diasParaCalculo(29)).toBe(29)
    expect(diasParaCalculo(30)).toBe(30)
  })

  it("acima do teto, congela no 30º dia — a dívida para de crescer sozinha", () => {
    expect(diasParaCalculo(31)).toBe(30)
    expect(diasParaCalculo(400)).toBe(30)
  })

  it("dentroDoCalculoAutomatico marca onde o cron para", () => {
    expect(dentroDoCalculoAutomatico(30)).toBe(true)
    expect(dentroDoCalculoAutomatico(31)).toBe(false)
  })

  it("o módulo não aplica o teto sozinho — quem decide é o chamador", async () => {
    // O recálculo do ADMIN passa por aqui e IGNORA o teto de propósito: é o
    // único caminho que pode mover o valor depois do 30º dia.
    const b = makeBooking({ lateFeeAmount: 4500, lateFeeSessionExpiresAt: ONTEM })
    const r = await emitirCobrancaTaxaAtraso(b, "Furadeira", 90000, 120, AGORA)
    expect(r).toMatchObject({ emitida: true, valor: 90000 })
  })
})

describe("até quando o atraso foi contado", () => {
  it("grava a data e a coloca na descrição da cobrança", async () => {
    await emitirCobrancaTaxaAtraso(makeBooking(), "Furadeira", 4500, 30, new Date("2026-09-30T12:00:00Z"))

    const { data } = mockBookingUpdate.mock.calls[0][0] as { data: Record<string, unknown> }
    expect(data.lateFeeCalculatedUntil).toEqual(new Date("2026-09-30T12:00:00Z"))

    // Sem a data, "R$ 45,00" nao diz a que periodo se refere: o calculo
    // automatico para no 30o dia e o admin pode atualizar a divida depois.
    const args = mockSessionCreate.mock.calls[0][0] as {
      line_items: { price_data: { product_data: { description: string } } }[]
    }
    expect(args.line_items[0].price_data.product_data.description)
      .toBe("30 dias em atraso — calculado até 30/09/2026")
  })

  it("o e-mail ao locatário leva a mesma data", async () => {
    await emitirCobrancaTaxaAtraso(makeBooking(), "Furadeira", 750, 1, new Date("2026-08-31T12:00:00Z"))

    const args = mockSendEmail.mock.calls[0]
    expect(args[args.length - 1]).toBe("31/08/2026")
  })

  it("um dia só não vira \"dias\"", async () => {
    await emitirCobrancaTaxaAtraso(makeBooking(), "Furadeira", 750, 1, new Date("2026-08-31T12:00:00Z"))
    const args = mockSessionCreate.mock.calls[0][0] as {
      line_items: { price_data: { product_data: { description: string } } }[]
    }
    expect(args.line_items[0].price_data.product_data.description)
      .toBe("1 dia em atraso — calculado até 31/08/2026")
  })
})
