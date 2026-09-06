/** @jest-environment node */
/**
 * Guarda de regressão do cron de reengajamento.
 *
 * O teste que dá nome a este arquivo é o `não reenvia`: o bug original mandava
 * o aviso de favorito TODO DIA, para sempre, um e-mail por item, porque a rota
 * não guardava registro de envio. Rodar o handler de novo — mesmo um mês
 * depois, quando o teto da semana já não protege nada — tem que produzir um
 * envio, não dois.
 *
 * O bug era invisível de dentro: `{ ok: true }` nas duas execuções, log limpo,
 * nenhum erro. Só aparecia na caixa de entrada de quem recebia. Por isso o que
 * se afirma aqui é a CONTAGEM DE ENVIOS, e não o status da resposta.
 */

import { prisma } from "@/lib/prisma"
import { sendAppEmail } from "@/lib/email"

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock("@/lib/prisma", () => ({
  prisma: {
    booking:         { findMany: jest.fn() },
    item:            { findMany: jest.fn() },
    user:            { findMany: jest.fn() },
    engagementEmail: { delete: jest.fn() },
    $executeRaw:     jest.fn(),
  },
}))

jest.mock("@/lib/email", () => ({ sendAppEmail: jest.fn() }))

// Cron autenticado — o foco aqui é a cadência de envio, não o guard.
jest.mock("@/lib/auth/cron-guard", () => ({ assertCronAuth: () => null }))

const mockBookings = prisma.booking.findMany as jest.Mock
const mockUsers    = prisma.user.findMany as jest.Mock
const mockClaim    = prisma.$executeRaw as unknown as jest.Mock
const mockSend     = sendAppEmail as jest.Mock

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { GET } = require("@/app/api/cron/reengagement/route") as {
  GET: (req: Request) => Promise<Response>
}

const req = () => new Request("https://shareo.com.br/api/cron/reengagement")

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Banco de mentira que reproduz as DUAS regras que o `INSERT` real aplica: o
 * `WHERE NOT EXISTS` (teto de 7 dias) e o `ON CONFLICT` (dedupe). Um mock que
 * simplesmente aceitasse o insert aprovaria exatamente o bug que este arquivo
 * guarda.
 *
 * 🪤 A leitura dos parâmetros é POSICIONAL, na ordem em que o template do
 * `$executeRaw` os interpola. Por isso o fake também confere que o SQL ainda
 * traz as duas cláusulas: se alguém reescrever a consulta e tirar uma delas, o
 * teste quebra alto em vez de continuar verde sobre uma garantia que sumiu.
 */
function fakeEngagementTable() {
  const rows: { key: string; userId: string; at: number }[] = []

  mockClaim.mockImplementation(async (sql: TemplateStringsArray, ...v: unknown[]) => {
    const text = sql.join("?")
    if (!text.includes("NOT EXISTS")) throw new Error("claim perdeu o teto (NOT EXISTS)")
    if (!text.includes("ON CONFLICT")) throw new Error("claim perdeu o dedupe (ON CONFLICT)")

    // [uuid, userId, kind, dedupeKey, userId, since]
    const [, userId, kind, dedupeKey, , since] = v as [string, string, string, string, string, Date]

    if (rows.some((r) => r.userId === userId && r.at >= since.getTime())) return 0 // teto
    const key = `${userId}|${kind}|${dedupeKey}`
    if (rows.some((r) => r.key === key)) return 0 // dedupe

    rows.push({ key, userId, at: Date.now() })
    return 1
  })

  return {
    /** Envelhece o que já foi enviado, para sair da janela do teto. */
    advanceDays(n: number) {
      for (const r of rows) r.at -= n * DAY_MS
    },
  }
}

const FAVORITE_USER = {
  id:    "user-1",
  email: "roberto@example.com",
  name:  "Roberto Epifanio",
  favorites: [
    { item: { id: "item-1", title: "Bicicleta MTB Aro 29", pricePerDay: 6000 } },
    { item: { id: "item-2", title: "Barraca de camping 4p", pricePerDay: 8000 } },
  ],
}

const COMPLETED_BOOKING = {
  id:         "booking-1",
  borrowerId: FAVORITE_USER.id,
  borrower:   { email: FAVORITE_USER.email, name: FAVORITE_USER.name },
  item:       { title: "Furadeira Bosch", categoryId: "cat-1", city: "Natal" },
}

let db: ReturnType<typeof fakeEngagementTable>

beforeEach(() => {
  jest.clearAllMocks()
  db = fakeEngagementTable()
  mockBookings.mockResolvedValue([])
  mockUsers.mockResolvedValue([FAVORITE_USER])
  mockSend.mockResolvedValue({ error: null })
})

describe("cron de reengajamento — não reenvia", () => {
  it("manda o digest uma vez só, mesmo um mês depois, quando o teto já não protege", async () => {
    await GET(req())
    db.advanceDays(30) // sai da janela de 7 dias: só o dedupe segura agora
    await GET(req())

    // O bug original produzia 2 aqui — e 4, porque enviava um e-mail por item.
    expect(mockSend).toHaveBeenCalledTimes(1)
  })

  it("junta todos os favoritos num único e-mail, não um por item", async () => {
    await GET(req())

    expect(mockSend).toHaveBeenCalledTimes(1)
    const { html } = mockSend.mock.calls[0][0]
    expect(html).toContain("Bicicleta MTB Aro 29")
    expect(html).toContain("Barraca de camping 4p")
  })

  it("formata o preço em pt-BR — saía 'R$ 60.00' na caixa de entrada", async () => {
    await GET(req())

    const { html } = mockSend.mock.calls[0][0]
    expect(html).toContain("60,00")
    expect(html).not.toContain("60.00")
  })

  it("linka o item pelo id — /itens/{slug} não resolve e dava 404", async () => {
    await GET(req())

    const { html } = mockSend.mock.calls[0][0]
    expect(html).toContain("/itens/item-1")
  })
})

describe("cron de reengajamento — teto global", () => {
  it("um só e-mail quando avaliação e digest caem no mesmo dia", async () => {
    mockBookings.mockResolvedValue([COMPLETED_BOOKING])

    await GET(req())

    // Lembrete de avaliação vence — nasce de transação real e roda primeiro.
    expect(mockSend).toHaveBeenCalledTimes(1)
    expect(mockSend.mock.calls[0][0].subject).toContain("avaliação")
  })

  it("libera o próximo e-mail depois que a janela de 7 dias passa", async () => {
    mockBookings.mockResolvedValue([COMPLETED_BOOKING])
    await GET(req())

    db.advanceDays(8)
    mockBookings.mockResolvedValue([]) // a locação já saiu da janela de 1 dia
    await GET(req())

    expect(mockSend).toHaveBeenCalledTimes(2)
    expect(mockSend.mock.calls[1][0].subject).toContain("favorito")
  })
})

describe("cron de reengajamento — relatório", () => {
  it("separa enviados de pulados: 'errors: 0' não podia significar sucesso", async () => {
    await GET(req())
    const res = await GET(req()) // segunda execução: tudo já foi enviado

    const body = await res.json()
    expect(body.report.digest).toEqual({ sent: 0, skipped: 1, errors: 0 })
  })
})

describe("cron de reengajamento — falha de envio", () => {
  it("devolve a reserva para o envio poder ser tentado de novo", async () => {
    mockSend.mockResolvedValue({ error: { message: "Resend indisponível" } })

    const res = await GET(req())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.report.digest.errors).toBe(1)
    // Sem o release, a chave de dedupe é estável e o e-mail daquela pessoa
    // ficaria queimado para sempre por uma falha momentânea do provedor.
    expect(prisma.engagementEmail.delete).toHaveBeenCalled()
  })
})
