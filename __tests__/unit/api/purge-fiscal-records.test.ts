/** @jest-environment node */
/**
 * Expurgo dos registros financeiros retidos após 5 anos.
 *
 * 🪤 A promessa existia sem a rotina: ao excluir a conta, o sistema dizia ao
 * titular que os registros "serão expurgados automaticamente após o prazo", e
 * nenhum cron os apagava. Estes testes fixam as duas regras que decidem QUEM é
 * apagado — errar para mais destrói histórico fiscal de quem não pediu nada.
 */
import { NextRequest } from "next/server"

const mockPayoutDelete = jest.fn()
const mockTxDelete     = jest.fn()
const mockTxCount      = jest.fn()

jest.mock("@/lib/prisma", () => ({
  prisma: {
    payout:              { deleteMany: (...a: unknown[]) => mockPayoutDelete(...a) },
    platformTransaction: {
      deleteMany: (...a: unknown[]) => mockTxDelete(...a),
      count:      (...a: unknown[]) => mockTxCount(...a),
    },
  },
}))

const SEGREDO = "segredo-de-cron-para-teste"

function req(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost:3000/api/cron/purge-fiscal-records", { headers })
}

describe("GET /api/cron/purge-fiscal-records", () => {
  const original = process.env.CRON_SECRET

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.CRON_SECRET = SEGREDO
    mockPayoutDelete.mockResolvedValue({ count: 2 })
    mockTxDelete.mockResolvedValue({ count: 3 })
    mockTxCount.mockResolvedValue(1)
  })
  afterAll(() => { process.env.CRON_SECRET = original })

  const rodar = async () => {
    const { GET } = await import("@/app/api/cron/purge-fiscal-records/route")
    return GET(req({ authorization: `Bearer ${SEGREDO}` }))
  }

  it("sem o segredo do cron, 401 e nada é apagado", async () => {
    const { GET } = await import("@/app/api/cron/purge-fiscal-records/route")
    const res = await GET(req())
    expect(res.status).toBe(401)
    expect(mockPayoutDelete).not.toHaveBeenCalled()
    expect(mockTxDelete).not.toHaveBeenCalled()
  })

  it("🪤 só apaga payout de titular que EXCLUIU a conta", async () => {
    await rodar()
    const [where] = mockPayoutDelete.mock.calls[0] as [{ where: Record<string, unknown> }]
    expect(where.where.ownerPaymentAccount).toEqual({ user: { deletedAt: { not: null } } })
  })

  it("🪤 transação só cai quando as DUAS partes excluíram a conta", async () => {
    // Com OR aqui, a exclusão de uma parte apagaria o histórico fiscal da
    // outra, que continua ativa e não pediu nada.
    await rodar()
    const [where] = mockTxDelete.mock.calls[0] as [{ where: { booking: Record<string, unknown> } }]
    expect(where.where.booking).toEqual({
      borrower: { deletedAt: { not: null } },
      owner:    { deletedAt: { not: null } },
    })
  })

  it("o corte é de 5 anos, não de meses", async () => {
    await rodar()
    const [where] = mockTxDelete.mock.calls[0] as [{ where: { createdAt: { lt: Date } } }]
    const corte = where.where.createdAt.lt
    const anos  = (Date.now() - corte.getTime()) / (365.25 * 24 * 3600 * 1000)
    expect(anos).toBeGreaterThan(4.9)
    expect(anos).toBeLessThan(5.1)
  })

  it("o resumo diz o que foi apagado e o que ficou", async () => {
    // Sem o contador de retidas, ninguém distingue "nada venceu" de "venceu e
    // não pôde apagar porque uma parte segue ativa".
    const res  = await rodar()
    const body = await res.json() as Record<string, unknown>
    expect(body).toMatchObject({
      ok: true,
      retentionYears: 5,
      payoutsDeleted: 2,
      transactionsDeleted: 3,
      retidasPorParteAtiva: 1,
    })
  })

  it("payout é apagado ANTES da transação", async () => {
    // Ordem deliberada: se a segunda chamada falhar, não sobra payout órfão de
    // uma transação já apagada.
    await rodar()
    expect(mockPayoutDelete.mock.invocationCallOrder[0])
      .toBeLessThan(mockTxDelete.mock.invocationCallOrder[0])
  })
})
