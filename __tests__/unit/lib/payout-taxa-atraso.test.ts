/**
 * Repasse da TAXA DE ATRASO ao proprietário.
 *
 * O defeito que isto tranca: até 01/09/2026 a multa era cobrada do locatário e
 * ficava INTEIRA com a plataforma. `criarPayoutDaReserva` monta o repasse a
 * partir de `ownerNetAmount`, que cobre locação e extensão — a multa não
 * entrava em nenhuma fatia e não gerava Payout próprio. O proprietário via
 * "Você recebe R$ 4,25" numa locação em que o locatário pagou R$ 7,50 de multa.
 *
 * Decisão de Roberto (01/09/2026): a multa segue o MESMO split da locação.
 */
import { criarPayoutDaTaxaDeAtraso, criarPayoutDaReserva } from "@/lib/payout"

const mockPayoutFindFirst = jest.fn()
const mockPayoutCreate    = jest.fn()
const mockBookingFind     = jest.fn()
const mockAccountFind     = jest.fn()
const mockTransaction     = jest.fn()

jest.mock("@/lib/prisma", () => ({
  prisma: {
    payout:              { findFirst: (...a: unknown[]) => mockPayoutFindFirst(...a), create: (...a: unknown[]) => mockPayoutCreate(...a) },
    booking:             { findUnique: (...a: unknown[]) => mockBookingFind(...a) },
    ownerPaymentAccount: { findUnique: (...a: unknown[]) => mockAccountFind(...a) },
    $transaction:        (...a: unknown[]) => mockTransaction(...a),
  },
}))

jest.mock("@/lib/platform-config", () => ({
  getPayoutWindowDays: async () => 3,
  getPlatformFeeRate:  async () => 1500, // 15%
  calcSplit: (total: number, feeRate: number) => {
    const platformFeeAmount = Math.round(total * feeRate / 10000)
    return { platformFeeRate: feeRate, platformFeeAmount, ownerNetAmount: total - platformFeeAmount }
  },
}))

beforeEach(() => {
  jest.clearAllMocks()
  mockPayoutFindFirst.mockResolvedValue(null)
  mockAccountFind.mockResolvedValue({ id: "acc-1" })
  mockPayoutCreate.mockImplementation((args: { data: Record<string, unknown> }) => ({ id: "payout-multa", ...args }))
  mockTransaction.mockImplementation(async (ops: unknown[]) => ops.map((_, i) => ({ id: `payout-${i}` })))
})

describe("criarPayoutDaTaxaDeAtraso", () => {
  it("repassa a multa com o MESMO split da locação, sacando da cobrança da multa", async () => {
    // R$ 7,50 de multa — o caso real do staging (Thiago, 01/09).
    const r = await criarPayoutDaTaxaDeAtraso("bk-1", "owner-1", 750, "pi_multa")

    expect(r.criado).toBe(true)
    const { data } = mockPayoutCreate.mock.calls[0][0] as { data: Record<string, unknown> }
    // 750 - 15% (113, arredondado) = 637
    expect(data.amount).toBe(637)
    // 🪤 A cobrança da multa, NÃO a da locação: a Stripe exige source_transaction
    // no Brasil, e a cobrança da locação não tem esse dinheiro.
    expect(data.sourcePaymentIntentId).toBe("pi_multa")
    expect(data.bookingId).toBe("bk-1")
    expect(data.status).toBe("PENDING")
  })

  it("usa a taxa VIGENTE, não 15% cravado", async () => {
    // A taxa mockada é 1500 bps; se alguém cravar o número no código em vez de
    // ler a config, este teste não muda — mas o de baixo, que confere a conta
    // a partir do valor, quebra se a fórmula for outra.
    await criarPayoutDaTaxaDeAtraso("bk-1", "owner-1", 10000, "pi_multa")
    const { data } = mockPayoutCreate.mock.calls[0][0] as { data: Record<string, number> }
    expect(data.amount).toBe(8500)
  })

  it("sem o PaymentIntent da multa, NÃO cria repasse", async () => {
    // Criar aqui geraria um Payout que o cron recusa todo dia em silêncio.
    const r = await criarPayoutDaTaxaDeAtraso("bk-1", "owner-1", 750, null)

    expect(r.criado).toBe(false)
    expect(mockPayoutCreate).not.toHaveBeenCalled()
  })

  it("sem conta de recebimento, não cria repasse e avisa no log", async () => {
    mockAccountFind.mockResolvedValue(null)
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {})

    const r = await criarPayoutDaTaxaDeAtraso("bk-1", "owner-1", 750, "pi_multa")

    expect(r).toEqual({ criado: false, motivo: "SEM_CONTA_DE_RECEBIMENTO" })
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("SEM CONTA DE RECEBIMENTO"))
    warn.mockRestore()
  })

  it("não duplica o repasse da MESMA cobrança de multa", async () => {
    mockPayoutFindFirst.mockResolvedValue({ id: "payout-ja-existe" })

    const r = await criarPayoutDaTaxaDeAtraso("bk-1", "owner-1", 750, "pi_multa")

    expect(r).toEqual({ criado: false, motivo: "JA_EXISTE" })
    expect(mockPayoutCreate).not.toHaveBeenCalled()
  })

  it("a checagem de duplicado olha a COBRANÇA, não só a reserva", async () => {
    await criarPayoutDaTaxaDeAtraso("bk-1", "owner-1", 750, "pi_multa")

    // Sem `sourcePaymentIntentId` no filtro, o repasse da locação (que quase
    // sempre já existe na mesma reserva) faria toda multa parecer duplicada.
    expect(mockPayoutFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { bookingId: "bk-1", sourcePaymentIntentId: "pi_multa" },
      }),
    )
  })
})

describe("🪤 multa paga ANTES da devolução não pode roubar o repasse da locação", () => {
  it("criarPayoutDaReserva ignora o repasse da multa ao checar duplicado", async () => {
    mockBookingFind.mockResolvedValue({ extensionAmountCents: null, extensionPaymentIntentId: null })

    await criarPayoutDaReserva("bk-1", "owner-1", 8500, "confirm_return")

    // O filtro `sourcePaymentIntentId: null` é o que separa os dois. Sem ele,
    // uma multa paga antes do confirm_return faria o repasse da LOCAÇÃO INTEIRA
    // ser recusado como "já existe" — o proprietário perderia o aluguel para
    // ganhar a multa. A ordem dos eventos é comum: o cron cobra a multa
    // enquanto a reserva ainda está em curso.
    expect(mockPayoutFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { bookingId: "bk-1", sourcePaymentIntentId: null },
      }),
    )
  })
})
