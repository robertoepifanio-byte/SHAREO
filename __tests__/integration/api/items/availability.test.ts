/** @jest-environment node */
/**
 * Testes de integração para GET /api/items/[id]/availability
 *
 * Arquivo fonte: app/api/items/[id]/availability/route.ts
 *
 * Achado do fundador (teste manual de locação/devolução): devolvendo o item
 * antes do prazo, a agenda continuava marcando as datas restantes da locação
 * original como ocupadas ("vermelho"), mesmo já sendo possível criar uma nova
 * reserva ali (findOverlappingItem só bloqueia CONFIRMED/ACTIVE). A causa era
 * usar sempre `endDate` (data planejada) na expansão de dias ocupados, em vez
 * de `returnRequestedAt` (quando o item volta fisicamente ao locador) para
 * reservas já RETURNED/COMPLETED.
 */

import { NextRequest } from "next/server"
import { GET } from "@/app/api/items/[id]/availability/route"

const mockItemFindFirst        = jest.fn()
const mockBookingItemFindMany  = jest.fn()

jest.mock("@/lib/prisma", () => ({
  prisma: {
    item: { findFirst: (...a: unknown[]) => mockItemFindFirst(...a) },
    bookingItem: { findMany: (...a: unknown[]) => mockBookingItemFindMany(...a) },
  },
}))

const ITEM_ID = "item-1"

function req() {
  return new NextRequest(`http://localhost:3000/api/items/${ITEM_ID}/availability`)
}
function params() {
  return { params: Promise.resolve({ id: ITEM_ID }) }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockItemFindFirst.mockResolvedValue({ id: ITEM_ID })
})

describe("GET /api/items/[id]/availability", () => {
  it("reserva CONFIRMED: ocupa até endDate normalmente", async () => {
    mockBookingItemFindMany.mockResolvedValue([
      {
        booking: {
          startDate: new Date("2027-01-10T00:00:00Z"),
          endDate:   new Date("2027-01-12T00:00:00Z"),
          status:    "CONFIRMED",
          returnRequestedAt: null,
        },
      },
    ])

    const res  = await GET(req(), params())
    const body = await res.json() as { data: string[] }

    expect(body.data).toEqual(["2027-01-10", "2027-01-11", "2027-01-12"])
  })

  it("devolução ANTECIPADA (RETURNED): ocupa só até returnRequestedAt, não até o endDate planejado", async () => {
    mockBookingItemFindMany.mockResolvedValue([
      {
        booking: {
          startDate:         new Date("2027-01-10T00:00:00Z"),
          endDate:           new Date("2027-01-15T00:00:00Z"), // planejado: 5 dias
          status:            "RETURNED",
          returnRequestedAt: new Date("2027-01-11T00:00:00Z"), // devolveu no 2º dia
        },
      },
    ])

    const res  = await GET(req(), params())
    const body = await res.json() as { data: string[] }

    // 12, 13, 14, 15/01 devem estar LIVRES — é exatamente o bug relatado
    expect(body.data).toEqual(["2027-01-10", "2027-01-11"])
    expect(body.data).not.toContain("2027-01-15")
  })

  it("devolução ANTECIPADA (COMPLETED): mesmo comportamento de RETURNED", async () => {
    mockBookingItemFindMany.mockResolvedValue([
      {
        booking: {
          startDate:         new Date("2027-02-01T00:00:00Z"),
          endDate:           new Date("2027-02-05T00:00:00Z"),
          status:            "COMPLETED",
          returnRequestedAt: new Date("2027-02-02T00:00:00Z"),
        },
      },
    ])

    const res  = await GET(req(), params())
    const body = await res.json() as { data: string[] }

    expect(body.data).toEqual(["2027-02-01", "2027-02-02"])
  })

  it("RETURNED sem returnRequestedAt (dado legado): usa endDate como fallback, não quebra", async () => {
    mockBookingItemFindMany.mockResolvedValue([
      {
        booking: {
          startDate:         new Date("2027-03-01T00:00:00Z"),
          endDate:           new Date("2027-03-02T00:00:00Z"),
          status:            "RETURNED",
          returnRequestedAt: null,
        },
      },
    ])

    const res  = await GET(req(), params())
    const body = await res.json() as { data: string[] }

    expect(body.data).toEqual(["2027-03-01", "2027-03-02"])
  })

  it("devolução no prazo (returnRequestedAt == endDate): sem diferença de comportamento", async () => {
    mockBookingItemFindMany.mockResolvedValue([
      {
        booking: {
          startDate:         new Date("2027-04-01T00:00:00Z"),
          endDate:           new Date("2027-04-03T00:00:00Z"),
          status:            "COMPLETED",
          returnRequestedAt: new Date("2027-04-03T00:00:00Z"),
        },
      },
    ])

    const res  = await GET(req(), params())
    const body = await res.json() as { data: string[] }

    expect(body.data).toEqual(["2027-04-01", "2027-04-02", "2027-04-03"])
  })
})
