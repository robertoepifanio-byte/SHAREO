/** @jest-environment node */
/**
 * TEST-BL1 — Testes de integração para lib/booking-availability.ts
 *
 * `findOverlappingItem` usa `Prisma.TransactionClient` como parâmetro e
 * não tinha nenhuma cobertura. Testamos aqui mockando o tx client no mesmo
 * padrão já adotado em __tests__/integration/api/bookings/post.test.ts —
 * onde `$transaction` recebe um objeto com os models mockados.
 *
 * Casos cobertos:
 *   (a) item sem sobreposição de datas → null
 *   (b) item com reserva sobreposta em status ativo (CONFIRMED/ACTIVE) → encontra conflito
 *   (c) item com reserva sobreposta mas CANCELLED/COMPLETED/PENDING → não conta como conflito
 *   (d) datas adjacentes mas não sobrepostas (edge case de fronteira)
 *   (e) excludeBookingId exclui a própria reserva do check (re-confirmação idempotente)
 *   (f) múltiplos itemIds — retorna o primeiro em conflito
 *   (g) lista de itemIds vazia → null
 *   (h) filtro de soft-delete: deletedAt: null no WHERE
 */

import { findOverlappingItem } from "@/lib/booking-availability"
import type { Prisma } from "@prisma/client"

// ---------------------------------------------------------------------------
// Mock do Prisma transaction client
// ---------------------------------------------------------------------------

const mockBookingItemFindFirst = jest.fn()

/** Tx client mínimo com o que `findOverlappingItem` acessa. */
const tx = {
  bookingItem: {
    findFirst: (...args: unknown[]) => mockBookingItemFindFirst(...args),
  },
} as unknown as Prisma.TransactionClient

// ---------------------------------------------------------------------------
// Datas de referência
// ---------------------------------------------------------------------------

const D1 = new Date("2026-08-01T12:00:00Z") // início da nova reserva
const D2 = new Date("2026-08-05T12:00:00Z") // fim da nova reserva

const ITEM_A   = "ckitemaaaaaaaaaaaaaaa01"
const ITEM_B   = "ckitemaaaaaaaaaaaaaaa02"
const BOOKING_X = "ckbooking000000000000001"

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks()
})

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe("findOverlappingItem", () => {

  describe("(a) sem sobreposição — retorna null", () => {
    it("quando não há reserva nenhuma nos itemIds informados", async () => {
      mockBookingItemFindFirst.mockResolvedValue(null)

      const result = await findOverlappingItem(tx, [ITEM_A], D1, D2)

      expect(result).toBeNull()
      expect(mockBookingItemFindFirst).toHaveBeenCalledTimes(1)
    })

    it("quando prisma não encontra hit para período completamente anterior", async () => {
      mockBookingItemFindFirst.mockResolvedValue(null)

      const pastStart = new Date("2026-07-01T12:00:00Z")
      const pastEnd   = new Date("2026-07-10T12:00:00Z")

      const result = await findOverlappingItem(tx, [ITEM_A], pastStart, pastEnd)

      expect(result).toBeNull()
    })

    it("quando prisma não encontra hit para período completamente posterior", async () => {
      mockBookingItemFindFirst.mockResolvedValue(null)

      const futureStart = new Date("2026-09-01T12:00:00Z")
      const futureEnd   = new Date("2026-09-10T12:00:00Z")

      const result = await findOverlappingItem(tx, [ITEM_A], futureStart, futureEnd)

      expect(result).toBeNull()
    })
  })

  describe("(b) sobreposição em status bloqueante (CONFIRMED ou ACTIVE) — retorna itemId", () => {
    it("retorna o itemId quando prisma encontra reserva CONFIRMED sobreposta", async () => {
      mockBookingItemFindFirst.mockResolvedValue({ itemId: ITEM_A })

      const result = await findOverlappingItem(tx, [ITEM_A], D1, D2)

      expect(result).toBe(ITEM_A)
    })

    it("retorna o itemId quando prisma encontra reserva ACTIVE sobreposta", async () => {
      mockBookingItemFindFirst.mockResolvedValue({ itemId: ITEM_A })

      const result = await findOverlappingItem(tx, [ITEM_A], D1, D2)

      expect(result).toBe(ITEM_A)
    })

    it("passa status { in: ['CONFIRMED', 'ACTIVE'] } para o Prisma", async () => {
      mockBookingItemFindFirst.mockResolvedValue({ itemId: ITEM_A })

      await findOverlappingItem(tx, [ITEM_A], D1, D2)

      const callArgs = mockBookingItemFindFirst.mock.calls[0][0]
      expect(callArgs.where.booking.status).toEqual({ in: ["CONFIRMED", "ACTIVE"] })
    })

    it("passa filtro de datas correto: startDate < endDate AND endDate > startDate", async () => {
      mockBookingItemFindFirst.mockResolvedValue(null)

      await findOverlappingItem(tx, [ITEM_A], D1, D2)

      const callArgs = mockBookingItemFindFirst.mock.calls[0][0]
      const andClause = callArgs.where.booking.AND
      expect(andClause).toEqual([
        { startDate: { lt: D2 } },
        { endDate:   { gt: D1 } },
      ])
    })
  })

  describe("(c) reserva sobreposta em status não-bloqueante — retorna null", () => {
    it("CANCELLED não bloqueia (não está nos blocking statuses)", async () => {
      mockBookingItemFindFirst.mockResolvedValue(null)

      const result = await findOverlappingItem(tx, [ITEM_A], D1, D2)

      expect(result).toBeNull()
      const callArgs = mockBookingItemFindFirst.mock.calls[0][0]
      expect(callArgs.where.booking.status.in).not.toContain("CANCELLED")
    })

    it("COMPLETED não bloqueia (não está nos blocking statuses)", async () => {
      mockBookingItemFindFirst.mockResolvedValue(null)

      const result = await findOverlappingItem(tx, [ITEM_A], D1, D2)

      expect(result).toBeNull()
      const callArgs = mockBookingItemFindFirst.mock.calls[0][0]
      expect(callArgs.where.booking.status.in).not.toContain("COMPLETED")
    })

    it("PENDING não bloqueia (não está nos blocking statuses)", async () => {
      mockBookingItemFindFirst.mockResolvedValue(null)

      await findOverlappingItem(tx, [ITEM_A], D1, D2)

      const callArgs = mockBookingItemFindFirst.mock.calls[0][0]
      expect(callArgs.where.booking.status.in).not.toContain("PENDING")
    })
  })

  describe("(d) datas adjacentes mas não sobrepostas — edge case de fronteira", () => {
    it("reserva que termina exatamente quando a nova começa não é conflito (Prisma retorna null)", async () => {
      // startDate < endDate → Ago-01 < Ago-01 → FALSE → sem sobreposição
      mockBookingItemFindFirst.mockResolvedValue(null)

      const newStart = new Date("2026-08-01T12:00:00Z")
      const newEnd   = new Date("2026-08-05T12:00:00Z")

      const result = await findOverlappingItem(tx, [ITEM_A], newStart, newEnd)

      expect(result).toBeNull()
      // Verifica que as datas corretas foram passadas ao Prisma
      const callArgs = mockBookingItemFindFirst.mock.calls[0][0]
      expect(callArgs.where.booking.AND[0]).toEqual({ startDate: { lt: newEnd } })
      expect(callArgs.where.booking.AND[1]).toEqual({ endDate:   { gt: newStart } })
    })

    it("reserva que começa exatamente quando a nova termina não é conflito (Prisma retorna null)", async () => {
      mockBookingItemFindFirst.mockResolvedValue(null)

      const result = await findOverlappingItem(tx, [ITEM_A], D1, D2)

      expect(result).toBeNull()
    })

    it("sobreposição de 1 dia é suficiente para bloquear (Prisma retorna hit)", async () => {
      // Overlap de apenas 1 dia — deve bloquear
      mockBookingItemFindFirst.mockResolvedValue({ itemId: ITEM_A })

      const result = await findOverlappingItem(tx, [ITEM_A], D1, D2)

      expect(result).toBe(ITEM_A)
    })
  })

  describe("(e) excludeBookingId — exclui a própria reserva do check", () => {
    it("passa id: { not: excludeBookingId } para o WHERE quando fornecido", async () => {
      mockBookingItemFindFirst.mockResolvedValue(null)

      await findOverlappingItem(tx, [ITEM_A], D1, D2, BOOKING_X)

      const callArgs = mockBookingItemFindFirst.mock.calls[0][0]
      expect(callArgs.where.booking.id).toEqual({ not: BOOKING_X })
    })

    it("não inclui filtro de id quando excludeBookingId é omitido", async () => {
      mockBookingItemFindFirst.mockResolvedValue(null)

      await findOverlappingItem(tx, [ITEM_A], D1, D2)

      const callArgs = mockBookingItemFindFirst.mock.calls[0][0]
      expect(callArgs.where.booking.id).toBeUndefined()
    })

    it("permite re-confirmar uma reserva sem conflitar consigo mesma", async () => {
      // Com excludeBookingId, o Prisma filtra a própria reserva → null
      mockBookingItemFindFirst.mockResolvedValue(null)

      const result = await findOverlappingItem(tx, [ITEM_A], D1, D2, BOOKING_X)

      expect(result).toBeNull()
    })
  })

  describe("(f) múltiplos itemIds", () => {
    it("passa todos os itemIds no filtro { in: [...] }", async () => {
      mockBookingItemFindFirst.mockResolvedValue(null)

      await findOverlappingItem(tx, [ITEM_A, ITEM_B], D1, D2)

      const callArgs = mockBookingItemFindFirst.mock.calls[0][0]
      expect(callArgs.where.itemId).toEqual({ in: [ITEM_A, ITEM_B] })
    })

    it("retorna o itemId em conflito encontrado pelo Prisma", async () => {
      mockBookingItemFindFirst.mockResolvedValue({ itemId: ITEM_B })

      const result = await findOverlappingItem(tx, [ITEM_A, ITEM_B], D1, D2)

      expect(result).toBe(ITEM_B)
    })
  })

  describe("(g) lista de itemIds vazia", () => {
    it("retorna null (Prisma recebe in: [] e não encontra nenhum item)", async () => {
      mockBookingItemFindFirst.mockResolvedValue(null)

      const result = await findOverlappingItem(tx, [], D1, D2)

      expect(result).toBeNull()
    })
  })

  describe("(h) filtro de soft-delete", () => {
    it("inclui deletedAt: null no WHERE de booking para ignorar reservas soft-deletadas", async () => {
      mockBookingItemFindFirst.mockResolvedValue(null)

      await findOverlappingItem(tx, [ITEM_A], D1, D2)

      const callArgs = mockBookingItemFindFirst.mock.calls[0][0]
      expect(callArgs.where.booking.deletedAt).toBeNull()
    })

    it("select retorna apenas { itemId: true }", async () => {
      mockBookingItemFindFirst.mockResolvedValue(null)

      await findOverlappingItem(tx, [ITEM_A], D1, D2)

      const callArgs = mockBookingItemFindFirst.mock.calls[0][0]
      expect(callArgs.select).toEqual({ itemId: true })
    })
  })
})
