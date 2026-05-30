import {
  CreateBookingSchema,
  ListBookingsQuerySchema,
  PatchBookingSchema,
} from "@/lib/validations/bookings"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Retorna uma string ISO datetime para N dias a partir de hoje à meia-noite. */
function isoFromNow(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

/** CUID válido de exemplo. */
const VALID_CUID = "clh3z2v0000001p68fxyz1234"

// ---------------------------------------------------------------------------
// CreateBookingSchema
// ---------------------------------------------------------------------------

describe("CreateBookingSchema", () => {
  describe("casos válidos", () => {
    it("aceita input mínimo válido sem borrowerNote", () => {
      const result = CreateBookingSchema.safeParse({
        itemId: VALID_CUID,
        startDate: isoFromNow(1),
        endDate: isoFromNow(3),
      })
      expect(result.success).toBe(true)
    })

    it("aceita input completo com borrowerNote", () => {
      const result = CreateBookingSchema.safeParse({
        itemId: VALID_CUID,
        startDate: isoFromNow(2),
        endDate: isoFromNow(5),
        borrowerNote: "Por favor, deixe disponível às 8h.",
      })
      expect(result.success).toBe(true)
    })

    it("aceita borrowerNote com exatamente 500 caracteres", () => {
      const result = CreateBookingSchema.safeParse({
        itemId: VALID_CUID,
        startDate: isoFromNow(1),
        endDate: isoFromNow(2),
        borrowerNote: "a".repeat(500),
      })
      expect(result.success).toBe(true)
    })
  })

  describe("campos obrigatórios ausentes", () => {
    it("rejeita quando itemId está ausente", () => {
      const result = CreateBookingSchema.safeParse({
        startDate: isoFromNow(1),
        endDate: isoFromNow(3),
      })
      expect(result.success).toBe(false)
    })

    it("rejeita quando startDate está ausente", () => {
      const result = CreateBookingSchema.safeParse({
        itemId: VALID_CUID,
        endDate: isoFromNow(3),
      })
      expect(result.success).toBe(false)
    })

    it("rejeita quando endDate está ausente", () => {
      const result = CreateBookingSchema.safeParse({
        itemId: VALID_CUID,
        startDate: isoFromNow(1),
      })
      expect(result.success).toBe(false)
    })
  })

  describe("validação de formato", () => {
    it("rejeita itemId que não é cuid", () => {
      const result = CreateBookingSchema.safeParse({
        itemId: "nao-e-um-cuid",
        startDate: isoFromNow(1),
        endDate: isoFromNow(3),
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain("itemId")
      }
    })

    it("rejeita startDate com formato inválido (não ISO)", () => {
      const result = CreateBookingSchema.safeParse({
        itemId: VALID_CUID,
        startDate: "2099-13-45",
        endDate: isoFromNow(3),
      })
      expect(result.success).toBe(false)
    })

    it("rejeita endDate com formato inválido (não ISO)", () => {
      const result = CreateBookingSchema.safeParse({
        itemId: VALID_CUID,
        startDate: isoFromNow(1),
        endDate: "amanha",
      })
      expect(result.success).toBe(false)
    })

    it("rejeita borrowerNote com mais de 500 caracteres", () => {
      const result = CreateBookingSchema.safeParse({
        itemId: VALID_CUID,
        startDate: isoFromNow(1),
        endDate: isoFromNow(3),
        borrowerNote: "x".repeat(501),
      })
      expect(result.success).toBe(false)
    })
  })

  describe("regras de negócio — datas", () => {
    it("rejeita startDate igual a hoje (deve ser a partir de amanhã)", () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const result = CreateBookingSchema.safeParse({
        itemId: VALID_CUID,
        startDate: today.toISOString(),
        endDate: isoFromNow(3),
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("startDate"))).toBe(true)
      }
    })

    it("rejeita startDate no passado", () => {
      const result = CreateBookingSchema.safeParse({
        itemId: VALID_CUID,
        startDate: isoFromNow(-5),
        endDate: isoFromNow(1),
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("startDate"))).toBe(true)
      }
    })

    it("rejeita endDate igual a startDate", () => {
      const date = isoFromNow(2)
      const result = CreateBookingSchema.safeParse({
        itemId: VALID_CUID,
        startDate: date,
        endDate: date,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("endDate"))).toBe(true)
      }
    })

    it("rejeita endDate anterior a startDate", () => {
      const result = CreateBookingSchema.safeParse({
        itemId: VALID_CUID,
        startDate: isoFromNow(5),
        endDate: isoFromNow(2),
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("endDate"))).toBe(true)
      }
    })
  })
})

// ---------------------------------------------------------------------------
// ListBookingsQuerySchema
// ---------------------------------------------------------------------------

describe("ListBookingsQuerySchema", () => {
  describe("defaults aplicados", () => {
    it("aplica role='all', page=1, limit=20 quando input está vazio", () => {
      const result = ListBookingsQuerySchema.safeParse({})
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.role).toBe("all")
        expect(result.data.page).toBe(1)
        expect(result.data.limit).toBe(20)
        expect(result.data.status).toBeUndefined()
      }
    })
  })

  describe("casos válidos", () => {
    it("aceita role='borrower'", () => {
      const result = ListBookingsQuerySchema.safeParse({ role: "borrower" })
      expect(result.success).toBe(true)
      if (result.success) expect(result.data.role).toBe("borrower")
    })

    it("aceita role='owner'", () => {
      const result = ListBookingsQuerySchema.safeParse({ role: "owner" })
      expect(result.success).toBe(true)
    })

    it("aceita todos os status válidos", () => {
      const statuses = [
        "PENDING",
        "CONFIRMED",
        "ACTIVE",
        "RETURNED",
        "COMPLETED",
        "CANCELLED",
        "DISPUTED",
      ] as const
      for (const status of statuses) {
        const result = ListBookingsQuerySchema.safeParse({ status })
        expect(result.success).toBe(true)
        if (result.success) expect(result.data.status).toBe(status)
      }
    })

    it("faz coerce de page e limit vindos como string (query string)", () => {
      const result = ListBookingsQuerySchema.safeParse({ page: "3", limit: "10" })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(3)
        expect(result.data.limit).toBe(10)
      }
    })

    it("aceita limit no valor máximo 50", () => {
      const result = ListBookingsQuerySchema.safeParse({ limit: "50" })
      expect(result.success).toBe(true)
    })
  })

  describe("casos inválidos", () => {
    it("rejeita role fora do enum", () => {
      const result = ListBookingsQuerySchema.safeParse({ role: "admin" })
      expect(result.success).toBe(false)
    })

    it("rejeita status fora do enum", () => {
      const result = ListBookingsQuerySchema.safeParse({ status: "UNKNOWN" })
      expect(result.success).toBe(false)
    })

    it("rejeita page menor que 1", () => {
      const result = ListBookingsQuerySchema.safeParse({ page: "0" })
      expect(result.success).toBe(false)
    })

    it("rejeita limit menor que 1", () => {
      const result = ListBookingsQuerySchema.safeParse({ limit: "0" })
      expect(result.success).toBe(false)
    })

    it("rejeita limit maior que 50", () => {
      const result = ListBookingsQuerySchema.safeParse({ limit: "51" })
      expect(result.success).toBe(false)
    })
  })
})

// ---------------------------------------------------------------------------
// PatchBookingSchema
// ---------------------------------------------------------------------------

describe("PatchBookingSchema", () => {
  describe("casos válidos", () => {
    it("aceita action='confirm' sem reason", () => {
      const result = PatchBookingSchema.safeParse({ action: "confirm" })
      expect(result.success).toBe(true)
    })

    it("aceita action='mark_active' sem reason", () => {
      const result = PatchBookingSchema.safeParse({ action: "mark_active" })
      expect(result.success).toBe(true)
    })

    it("aceita action='mark_returned' sem reason", () => {
      const result = PatchBookingSchema.safeParse({ action: "mark_returned" })
      expect(result.success).toBe(true)
    })

    it("aceita action='cancel' com reason fornecido", () => {
      const result = PatchBookingSchema.safeParse({
        action: "cancel",
        reason: "Preciso cancelar por motivo pessoal.",
      })
      expect(result.success).toBe(true)
    })

    it("aceita action='open_dispute' com reason fornecido", () => {
      const result = PatchBookingSchema.safeParse({
        action: "open_dispute",
        reason: "O item estava danificado na entrega.",
      })
      expect(result.success).toBe(true)
    })

    it("aceita reason com exatamente 500 caracteres para cancel", () => {
      const result = PatchBookingSchema.safeParse({
        action: "cancel",
        reason: "m".repeat(500),
      })
      expect(result.success).toBe(true)
    })
  })

  describe("cases inválidos — action fora do enum", () => {
    it("rejeita action desconhecida", () => {
      const result = PatchBookingSchema.safeParse({ action: "approve" })
      expect(result.success).toBe(false)
    })

    it("rejeita input sem action", () => {
      const result = PatchBookingSchema.safeParse({ reason: "algum motivo" })
      expect(result.success).toBe(false)
    })
  })

  describe("regra de negócio — reason obrigatório para cancel e open_dispute", () => {
    it("rejeita action='cancel' sem reason", () => {
      const result = PatchBookingSchema.safeParse({ action: "cancel" })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("reason"))).toBe(true)
      }
    })

    it("rejeita action='cancel' com reason vazio (apenas espaços)", () => {
      const result = PatchBookingSchema.safeParse({ action: "cancel", reason: "   " })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("reason"))).toBe(true)
      }
    })

    it("rejeita action='open_dispute' sem reason", () => {
      const result = PatchBookingSchema.safeParse({ action: "open_dispute" })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("reason"))).toBe(true)
      }
    })

    it("rejeita action='open_dispute' com reason vazio", () => {
      const result = PatchBookingSchema.safeParse({ action: "open_dispute", reason: "" })
      expect(result.success).toBe(false)
    })

    it("rejeita reason com mais de 500 caracteres", () => {
      const result = PatchBookingSchema.safeParse({
        action: "cancel",
        reason: "x".repeat(501),
      })
      expect(result.success).toBe(false)
    })
  })
})
