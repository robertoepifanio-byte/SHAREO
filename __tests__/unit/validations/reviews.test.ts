/**
 * Testes unitários para lib/validations/reviews.ts
 *
 * Schemas cobertos:
 *  - CreateReviewSchema — rating obrigatório, critérios opcionais, photoUrl com guard de storage
 *
 * Nota: isOwnStoragePhotoUrl depende de NEXT_PUBLIC_SUPABASE_URL.
 * Os testes configuram esta env var via beforeEach para validar o refine.
 */

import { CreateReviewSchema } from "@/lib/validations/reviews"

const FAKE_SUPABASE_URL = "https://zythygwvmrwrqmnrdufq.supabase.co"
const VALID_PHOTO_URL = `${FAKE_SUPABASE_URL}/storage/v1/object/public/booking-photos/test.jpg`

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = FAKE_SUPABASE_URL
})

afterEach(() => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL
})

// ---------------------------------------------------------------------------
// CreateReviewSchema — casos válidos
// ---------------------------------------------------------------------------

describe("CreateReviewSchema — casos válidos", () => {
  describe("campo rating (obrigatório)", () => {
    it("aceita payload mínimo com reviewType + rating", () => {
      const r = CreateReviewSchema.safeParse({ reviewType: "ITEM", rating: 5 })
      expect(r.success).toBe(true)
    })

    it("aceita todos os reviewTypes válidos", () => {
      for (const reviewType of ["ITEM", "BORROWER", "OWNER"] as const) {
        expect(CreateReviewSchema.safeParse({ reviewType, rating: 4 }).success).toBe(true)
      }
    })

    it("aceita ratings de 1 a 5", () => {
      for (const rating of [1, 2, 3, 4, 5]) {
        expect(CreateReviewSchema.safeParse({ reviewType: "ITEM", rating }).success).toBe(true)
      }
    })
  })

  describe("comment (opcional)", () => {
    it("aceita com comment de até 1000 caracteres", () => {
      const r = CreateReviewSchema.safeParse({
        reviewType: "ITEM",
        rating:     5,
        comment:    "Ótimo item, veio em perfeito estado!",
      })
      expect(r.success).toBe(true)
    })

    it("aceita sem comment", () => {
      expect(CreateReviewSchema.safeParse({ reviewType: "ITEM", rating: 3 }).success).toBe(true)
    })
  })

  describe("critérios múltiplos (opcionais, 1–5)", () => {
    it("aceita payload com todos os critérios preenchidos", () => {
      const r = CreateReviewSchema.safeParse({
        reviewType:      "ITEM",
        rating:          5,
        sentiment:       5,
        itemAsDescribed: 4,
        punctuality:     5,
        communication:   4,
        conservation:    5,
      })
      expect(r.success).toBe(true)
    })

    it("aceita critério 1 (mínimo)", () => {
      expect(
        CreateReviewSchema.safeParse({ reviewType: "ITEM", rating: 1, sentiment: 1 }).success,
      ).toBe(true)
    })

    it("aceita critério 5 (máximo)", () => {
      expect(
        CreateReviewSchema.safeParse({ reviewType: "ITEM", rating: 5, itemAsDescribed: 5 }).success,
      ).toBe(true)
    })
  })

  describe("photoUrl (opcional)", () => {
    it("aceita photoUrl hospedada no Supabase Storage da plataforma", () => {
      const r = CreateReviewSchema.safeParse({
        reviewType: "ITEM",
        rating:     5,
        photoUrl:   VALID_PHOTO_URL,
      })
      expect(r.success).toBe(true)
    })

    it("aceita sem photoUrl", () => {
      expect(CreateReviewSchema.safeParse({ reviewType: "ITEM", rating: 3 }).success).toBe(true)
    })
  })
})

// ---------------------------------------------------------------------------
// CreateReviewSchema — casos inválidos
// ---------------------------------------------------------------------------

describe("CreateReviewSchema — casos inválidos", () => {
  describe("rating fora do intervalo", () => {
    it("rejeita rating 0 (abaixo do mínimo)", () => {
      const r = CreateReviewSchema.safeParse({ reviewType: "ITEM", rating: 0 })
      expect(r.success).toBe(false)
      if (!r.success) expect(r.error.issues.some((i) => i.path.includes("rating"))).toBe(true)
    })

    it("rejeita rating 6 (acima do máximo)", () => {
      expect(CreateReviewSchema.safeParse({ reviewType: "ITEM", rating: 6 }).success).toBe(false)
    })

    it("rejeita rating fracionado (não inteiro)", () => {
      expect(CreateReviewSchema.safeParse({ reviewType: "ITEM", rating: 4.5 }).success).toBe(false)
    })
  })

  describe("reviewType fora do enum", () => {
    it("rejeita reviewType desconhecido", () => {
      expect(CreateReviewSchema.safeParse({ reviewType: "PRODUTO", rating: 5 }).success).toBe(false)
    })

    it("rejeita sem reviewType", () => {
      expect(CreateReviewSchema.safeParse({ rating: 5 }).success).toBe(false)
    })
  })

  describe("comment inválido", () => {
    it("rejeita comment com mais de 1000 caracteres", () => {
      const r = CreateReviewSchema.safeParse({
        reviewType: "ITEM",
        rating:     5,
        comment:    "x".repeat(1001),
      })
      expect(r.success).toBe(false)
    })
  })

  describe("critérios fora do intervalo", () => {
    it("rejeita sentiment = 0", () => {
      expect(
        CreateReviewSchema.safeParse({ reviewType: "ITEM", rating: 5, sentiment: 0 }).success,
      ).toBe(false)
    })

    it("rejeita punctuality = 6", () => {
      expect(
        CreateReviewSchema.safeParse({ reviewType: "ITEM", rating: 5, punctuality: 6 }).success,
      ).toBe(false)
    })
  })

  describe("photoUrl inválida", () => {
    it("rejeita URL que não é do Supabase Storage da plataforma", () => {
      const r = CreateReviewSchema.safeParse({
        reviewType: "ITEM",
        rating:     5,
        photoUrl:   "https://upload.wikimedia.org/foto.jpg",
      })
      expect(r.success).toBe(false)
      if (!r.success) expect(r.error.issues.some((i) => i.path.includes("photoUrl"))).toBe(true)
    })

    it("rejeita string que não é URL válida", () => {
      const r = CreateReviewSchema.safeParse({
        reviewType: "ITEM",
        rating:     5,
        photoUrl:   "nao-e-uma-url",
      })
      expect(r.success).toBe(false)
    })

    it("rejeita photoUrl do bucket correto mas com host diferente", () => {
      const r = CreateReviewSchema.safeParse({
        reviewType: "ITEM",
        rating:     5,
        photoUrl:   "https://outro-projeto.supabase.co/storage/v1/object/public/booking-photos/test.jpg",
      })
      expect(r.success).toBe(false)
    })
  })
})
