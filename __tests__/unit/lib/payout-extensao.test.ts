/**
 * Repasse quando houve extensão paga (ATOR-03).
 *
 * O defeito que isto tranca: a Stripe EXIGE `source_transaction` em
 * transferência envolvendo o Brasil, e ele liga a transferência a UMA cobrança.
 * As diárias extras estão em outra cobrança. Um Transfer só pediria à cobrança
 * da locação mais do que ela tem — recusa em silêncio no cron, ou, em extensão
 * pequena, uma transferência que come a taxa da plataforma.
 *
 * Daí um Payout por cobrança, e é isso que estes testes fixam.
 */
import { criarPayoutDaReserva } from "@/lib/payout"

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
  // $transaction recebe a lista de promises dos create() e devolve os ids.
  mockTransaction.mockImplementation(async (ops: unknown[]) => ops.map((_, i) => ({ id: `payout-${i}` })))
  mockPayoutCreate.mockImplementation((args: { data: Record<string, unknown> }) => args)
})

/** Extrai os `data` dos create() que entraram na transação. */
function repassesCriados() {
  return mockPayoutCreate.mock.calls.map((c) => c[0].data)
}

describe("criarPayoutDaReserva — sem extensão", () => {
  it("cria UM repasse, sacando da cobrança da locação", async () => {
    mockBookingFind.mockResolvedValue({ extensionAmountCents: null, extensionPaymentIntentId: null })

    const r = await criarPayoutDaReserva("bk-1", "owner-1", 8500, "confirm_return")

    expect(r.criado).toBe(true)
    const criados = repassesCriados()
    expect(criados).toHaveLength(1)
    expect(criados[0].amount).toBe(8500)
    // null = cobrança original — o comportamento de todo repasse anterior.
    expect(criados[0].sourcePaymentIntentId).toBeNull()
  })
})

describe("criarPayoutDaReserva — com extensão paga", () => {
  it("🪤 cria DOIS repasses, cada um sacando da SUA cobrança", async () => {
    mockBookingFind.mockResolvedValue({
      extensionAmountCents:     10500, // R$ 105 de diárias extras
      extensionPaymentIntentId: "pi_extensao",
    })

    // ownerNetAmount é o total (locação + extensão) já com 15% retidos.
    await criarPayoutDaReserva("bk-1", "owner-1", 17000, "confirm_return")

    const criados = repassesCriados()
    expect(criados).toHaveLength(2)

    const [locacao, extensao] = criados
    expect(locacao.sourcePaymentIntentId).toBeNull()
    expect(extensao.sourcePaymentIntentId).toBe("pi_extensao")

    // 15% de 10500 = 1575 → líquido da extensão = 8925
    expect(extensao.amount).toBe(8925)
    // E o resto sai da cobrança original.
    expect(locacao.amount).toBe(17000 - 8925)
  })

  it("as duas fatias somam exatamente o líquido do proprietário", async () => {
    // Valor escolhido para dar arredondamento quebrado: 15% de 3333 = 500 (499,95).
    mockBookingFind.mockResolvedValue({
      extensionAmountCents:     3333,
      extensionPaymentIntentId: "pi_extensao",
    })

    await criarPayoutDaReserva("bk-1", "owner-1", 9999, "confirm_return")

    const total = repassesCriados().reduce((s, p) => s + (p.amount as number), 0)
    // Não sobra nem falta centavo: o resto é subtraído, não recalculado.
    expect(total).toBe(9999)
  })

  it("extensão registrada mas sem cobrança própria cai no caminho de sempre", async () => {
    // Acontece quando a reserva ainda não estava paga: a extensão entrou no
    // checkout normal, então não há PaymentIntent separado de onde sacar.
    mockBookingFind.mockResolvedValue({
      extensionAmountCents:     10500,
      extensionPaymentIntentId: null,
    })

    await criarPayoutDaReserva("bk-1", "owner-1", 17000, "confirm_return")

    const criados = repassesCriados()
    expect(criados).toHaveLength(1)
    expect(criados[0].sourcePaymentIntentId).toBeNull()
    expect(criados[0].amount).toBe(17000)
  })
})
