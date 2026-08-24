/** @jest-environment node */
/**
 * PATCH /api/bookings/[id]/extend — proprietário responde à extensão.
 *
 * Arquivo fonte: app/api/bookings/[id]/extend/route.ts
 *
 * Dois achados do painel de dois atores (22/08/2026):
 *
 * 1. O POST (locatário pede) exige `status === "ACTIVE"`; o PATCH (proprietário
 *    responde) não exigia nada. Dava para pedir extensão, devolver o item, e o
 *    proprietário aprovar depois — empurrando o `endDate` de uma reserva já
 *    RETURNED para o futuro.
 *
 * 2. `new Date("2026-08-27")` é meia-noite UTC, que no Brasil é 26/08 às 21:00.
 *    A notificação dizia 27 e a tela dizia 26.
 *
 * 3. (ATOR-03, 24/08) Aprovar não cobrava nada: o `endDate` era empurrado e
 *    `totalDays`/`totalPrice`/split ficavam como estavam. Agora, reserva JÁ
 *    PAGA vai para AWAITING_PAYMENT sem mover a data; reserva não paga aplica
 *    na hora, porque o checkout normal cobra o total atualizado.
 */
import { NextRequest } from "next/server"
import { PATCH, POST } from "@/app/api/bookings/[id]/extend/route"

const mockQueryRaw   = jest.fn()
const mockExecuteRaw = jest.fn().mockResolvedValue(1)
const mockNotifCreate = jest.fn().mockResolvedValue({})

const mockAplicarExtensao = jest.fn().mockResolvedValue(undefined)

jest.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw:   (...a: unknown[]) => mockQueryRaw(...a),
    $executeRaw: (...a: unknown[]) => mockExecuteRaw(...a),
    notification: { create: (...a: unknown[]) => mockNotifCreate(...a) },
  },
}))

// aplicarExtensao mora em lib/payments/extension.ts e usa o client tipado do
// Prisma — mockar só `$executeRaw` não a alcança. Mockada aqui para o teste
// medir a DECISÃO da rota (aplicar agora vs. esperar pagamento), não o cálculo,
// que tem teste próprio.
jest.mock("@/lib/payments/extension", () => {
  const real = jest.requireActual("@/lib/payments/extension")
  return {
    ...real,
    aplicarExtensao: (...a: unknown[]) => mockAplicarExtensao(...a),
  }
})

const mockAuth = jest.fn()
jest.mock("@/lib/auth", () => ({ auth: () => mockAuth() }))

const OWNER_ID    = "owner-1"
const BORROWER_ID = "borrower-1"
const BOOKING_ID  = "bk-1"

function req(body: Record<string, unknown>, method: "PATCH" | "POST" = "PATCH") {
  return new NextRequest(`http://localhost:3000/api/bookings/${BOOKING_ID}/extend`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}
const params = { params: Promise.resolve({ id: BOOKING_ID }) }

function booking(over: Partial<Record<string, unknown>> = {}) {
  return [{
    id: BOOKING_ID,
    status: "ACTIVE",
    borrowerId: BORROWER_ID,
    ownerId: OWNER_ID,
    endDate: new Date("2026-08-24T12:00:00Z"),
    itemTitle: "Furadeira Bosch",
    extensionStatus: "PENDING",
    extensionRequestedEndDate: new Date("2026-08-27T12:00:00Z"),
    paymentStatus: "PENDING",
    dailyPrice: 3500,
    ...over,
  }]
}

beforeEach(() => {
  jest.clearAllMocks()
  mockExecuteRaw.mockResolvedValue(1)
  mockNotifCreate.mockResolvedValue({})
  mockAplicarExtensao.mockResolvedValue(undefined)
})

describe("PATCH extend — guard de status", () => {
  it("aprova quando a locação está em andamento", async () => {
    mockAuth.mockResolvedValue({ user: { id: OWNER_ID } })
    mockQueryRaw.mockResolvedValue(booking())

    const res = await PATCH(req({ action: "approve" }), params)
    expect(res.status).toBe(200)
    expect(mockExecuteRaw).toHaveBeenCalled()
  })

  it("reserva NÃO paga: aplica a extensão na hora — o checkout cobra o total atualizado", async () => {
    mockAuth.mockResolvedValue({ user: { id: OWNER_ID } })
    mockQueryRaw.mockResolvedValue(booking({ paymentStatus: "PENDING" }))

    const res  = await PATCH(req({ action: "approve" }), params)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.extensionStatus).toBe("APPROVED")
    expect(mockAplicarExtensao).toHaveBeenCalledWith(BOOKING_ID)
    // A data nova volta na resposta porque a extensão já vale.
    expect(body.data.endDate).toBeDefined()
  })

  it("🪤 reserva JÁ PAGA: NÃO move a data — fica aguardando as diárias extras", async () => {
    mockAuth.mockResolvedValue({ user: { id: OWNER_ID } })
    mockQueryRaw.mockResolvedValue(booking({ paymentStatus: "PAID" }))

    const res  = await PATCH(req({ action: "approve" }), params)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.extensionStatus).toBe("AWAITING_PAYMENT")
    // 3 dias × R$ 35,00 = R$ 105,00
    expect(body.data.extensionAmountCents).toBe(10500)
    // O coração do ATOR-03: nada de estender antes de pagar.
    expect(mockAplicarExtensao).not.toHaveBeenCalled()
    expect(body.data.endDate).toBeUndefined()
  })

  it("avisa o locatário que falta pagar, com o valor", async () => {
    mockAuth.mockResolvedValue({ user: { id: OWNER_ID } })
    mockQueryRaw.mockResolvedValue(booking({ paymentStatus: "PAID" }))

    await PATCH(req({ action: "approve" }), params)

    const notif = mockNotifCreate.mock.calls[0][0].data
    expect(notif.type).toBe("EXTENSION_APPROVED")
    expect(notif.title).toBe("Extensão aceita — falta pagar")
    expect(notif.body).toContain("105,00")
  })

  it("recusa continua sem cobrar nada e não aplica extensão", async () => {
    mockAuth.mockResolvedValue({ user: { id: OWNER_ID } })
    mockQueryRaw.mockResolvedValue(booking({ paymentStatus: "PAID" }))

    const res  = await PATCH(req({ action: "reject" }), params)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.extensionStatus).toBe("REJECTED")
    expect(mockAplicarExtensao).not.toHaveBeenCalled()
    expect(mockNotifCreate.mock.calls[0][0].data.type).toBe("EXTENSION_REJECTED")
  })

  it("🪤 RECUSA aprovar extensão de locação já devolvida", async () => {
    mockAuth.mockResolvedValue({ user: { id: OWNER_ID } })
    mockQueryRaw.mockResolvedValue(booking({ status: "RETURNED" }))

    const res  = await PATCH(req({ action: "approve" }), params)
    const body = await res.json() as { error: { code: string } }

    expect(res.status).toBe(422)
    expect(body.error.code).toBe("INVALID_STATUS")
    // O endDate NÃO pode ser empurrado numa reserva encerrada.
    expect(mockExecuteRaw).not.toHaveBeenCalled()
  })

  it("recusa também em COMPLETED e CANCELLED", async () => {
    mockAuth.mockResolvedValue({ user: { id: OWNER_ID } })
    for (const status of ["COMPLETED", "CANCELLED", "DISPUTED"]) {
      mockQueryRaw.mockResolvedValue(booking({ status }))
      const res = await PATCH(req({ action: "reject" }), params)
      expect(res.status).toBe(422)
    }
  })

  it("só o proprietário responde — locatário leva 403", async () => {
    mockAuth.mockResolvedValue({ user: { id: BORROWER_ID } })
    mockQueryRaw.mockResolvedValue(booking())

    expect((await PATCH(req({ action: "approve" }), params)).status).toBe(403)
  })
})

describe("POST extend — data ancorada no meio-dia local", () => {
  it("🪤 não grava meia-noite UTC (que no Brasil vira o dia anterior às 21h)", async () => {
    mockAuth.mockResolvedValue({ user: { id: BORROWER_ID } })
    mockQueryRaw.mockResolvedValue(booking({ extensionStatus: null }))

    await POST(req({ newEndDate: "2026-08-27" }, "POST"), params)

    // A data interpolada no UPDATE precisa cair em 27/08, não em 26/08T21:00 BRT.
    const gravadas = mockExecuteRaw.mock.calls
      .flatMap((c) => c.slice(1))
      .filter((v): v is Date => v instanceof Date)
    const alvo = gravadas.find((d) => d.toISOString().startsWith("2026-08-27"))

    // 🪤 `expect(valor, "mensagem")` é API do Playwright — no Jest é erro.
    expect(alvo).toBeTruthy()
    // Meia-noite UTC seria 00:00; o meio-dia local fica longe disso.
    expect(alvo!.getUTCHours()).toBeGreaterThan(0)
  })
})
