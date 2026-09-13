/** @jest-environment node */
/**
 * Guarda de regressão: o lembrete diário de atraso não pode continuar saindo
 * depois que a taxa de atraso já foi paga.
 *
 * Achado do Thiago (13/09): "o email de taxa de atraso está sendo enviado 1x
 * por semana, mesmo que a taxa de atraso for paga". Na prática o cron roda
 * DIARIAMENTE (vercel.json, 0 11 * * *) — pior que o relatado. O webhook de
 * pagamento (app/api/webhooks/stripe/route.ts) grava `lateFeePaymentIntentId`
 * mas não muda o `status` da reserva, então ela continua batendo na consulta
 * de "reservas em atraso" (status ACTIVE + endDate < hoje) todo dia, e o
 * e-mail "🚨 pague a multa" seguia saindo para quem já tinha pago.
 */

import { prisma } from "@/lib/prisma"
import { sendReminderOverdue, sendReminderStartTomorrow, sendReminderReturnTomorrow } from "@/lib/email"

jest.mock("@/lib/prisma", () => ({
  prisma: {
    booking: { findMany: jest.fn(), update: jest.fn() },
    notification: { createMany: jest.fn() },
  },
}))

jest.mock("@/lib/email", () => ({
  ...jest.requireActual("@/lib/email"),
  sendReminderStartTomorrow:  jest.fn(),
  sendReminderReturnTomorrow: jest.fn(),
  sendReminderOverdue:        jest.fn(),
}))

jest.mock("@/lib/auth/cron-guard", () => ({ assertCronAuth: () => null }))

jest.mock("@/lib/platform-config", () => ({
  ...jest.requireActual("@/lib/platform-config"),
  getLateFeeMultiplier: jest.fn().mockResolvedValue(1.5),
}))

// A cobrança (Stripe) não é o que este arquivo testa — só o lembrete por
// e-mail. Mock inofensivo: quem já pagou nem chega a chamar isto
// (`precisaCobrar` corta antes); quem não pagou ainda pode tentar reemitir a
// cobrança, e isso não deve derrubar o teste do lembrete.
jest.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    checkout: {
      sessions: {
        create: jest.fn().mockResolvedValue({ id: "cs_test_novo", url: "https://checkout.stripe.com/test" }),
        expire: jest.fn().mockResolvedValue({}),
      },
    },
  }),
}))

const mockFindMany = prisma.booking.findMany as jest.Mock
const mockOverdue   = sendReminderOverdue as jest.Mock

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { GET } = require("@/app/api/cron/reminders/route") as {
  GET: (req: Request) => Promise<Response>
}

const req = () => new Request("https://shareo.com.br/api/cron/reminders")

const BOOKING_BASE = {
  id: "booking-atraso-1",
  startDate: new Date("2026-09-01T00:00:00Z"),
  endDate:   new Date("2026-09-05T00:00:00Z"), // 8 dias de atraso em 13/09
  dailyPrice: 5000,
  lateFeeAmount: 3750,
  lateFeeSessionId: "cs_test_expired",
  lateFeeSessionExpiresAt: new Date("2026-09-06T00:00:00Z"), // já expirada
  borrowerId: "user-borrower", ownerId: "user-owner",
  item:     { title: "Furadeira Bosch", images: [] },
  borrower: { email: "locatario@example.com", name: "Locatário Teste" },
  owner:    { email: "dono@example.com", name: "Dono Teste" },
  _count:   { bookingItems: 1 },
}

/** As 4 consultas do cron, na mesma ordem do `Promise.all` da rota. */
function mockQueries({ overdue = [] as unknown[], multasEmAberto = [] as unknown[] } = {}) {
  mockFindMany
    .mockResolvedValueOnce([])            // startReminders
    .mockResolvedValueOnce([])            // returnReminders
    .mockResolvedValueOnce(overdue)        // overdueBookings
    .mockResolvedValueOnce(multasEmAberto) // multasEmAberto
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.useFakeTimers().setSystemTime(new Date("2026-09-13T11:00:00Z"))
})

afterEach(() => {
  jest.useRealTimers()
})

describe("cron de lembretes — não avisa atraso de quem já pagou a multa", () => {
  it("NÃO envia o lembrete quando a multa já foi paga (lateFeePaymentIntentId preenchido)", async () => {
    mockQueries({
      overdue: [{ ...BOOKING_BASE, lateFeePaymentIntentId: "pi_ja_pago" }],
    })

    const res = await GET(req())
    const body = await res.json()

    expect(mockOverdue).not.toHaveBeenCalled()
    expect(body.ids).not.toContain(expect.stringContaining("overdue:"))
  })

  it("continua enviando o lembrete para quem ainda não pagou — não é regressão de silêncio total", async () => {
    mockQueries({
      overdue: [{ ...BOOKING_BASE, lateFeePaymentIntentId: null }],
    })

    await GET(req())

    expect(mockOverdue).toHaveBeenCalledTimes(1)
    expect(mockOverdue).toHaveBeenCalledWith(
      "locatario@example.com", "Locatário Teste",
      "dono@example.com",      "Dono Teste",
      "Furadeira Bosch",       "booking-atraso-1",
      BOOKING_BASE.endDate,    expect.any(Number),
      BOOKING_BASE.dailyPrice, 1.5,
    )
  })
})
