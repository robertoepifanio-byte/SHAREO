/**
 * Testes unitários para lib/validations/users.ts
 *
 * Schemas cobertos:
 *  - UpdateProfileSchema — atualização de perfil de usuário
 *
 * Nota: o campo slug usa isValidSlug de lib/slugify.ts (já testado separadamente).
 */

import { UpdateProfileSchema } from "@/lib/validations/users"

// ---------------------------------------------------------------------------
// UpdateProfileSchema
// ---------------------------------------------------------------------------

describe("UpdateProfileSchema", () => {
  describe("objeto vazio (todos os campos são opcionais)", () => {
    it("aceita objeto vazio", () => {
      expect(UpdateProfileSchema.safeParse({}).success).toBe(true)
    })
  })

  describe("campo name", () => {
    it("aceita name com 3 caracteres (mínimo)", () => {
      expect(UpdateProfileSchema.safeParse({ name: "Ana" }).success).toBe(true)
    })

    it("aceita name com 100 caracteres (máximo)", () => {
      expect(UpdateProfileSchema.safeParse({ name: "A".repeat(100) }).success).toBe(true)
    })

    it("rejeita name com menos de 3 caracteres", () => {
      const r = UpdateProfileSchema.safeParse({ name: "AB" })
      expect(r.success).toBe(false)
      if (!r.success) expect(r.error.issues.some((i) => i.path.includes("name"))).toBe(true)
    })

    it("rejeita name com mais de 100 caracteres", () => {
      expect(UpdateProfileSchema.safeParse({ name: "A".repeat(101) }).success).toBe(false)
    })
  })

  describe("campo bio", () => {
    it("aceita bio de até 500 caracteres", () => {
      expect(UpdateProfileSchema.safeParse({ bio: "A".repeat(500) }).success).toBe(true)
    })

    it("aceita bio como null", () => {
      expect(UpdateProfileSchema.safeParse({ bio: null }).success).toBe(true)
    })

    it("rejeita bio com mais de 500 caracteres", () => {
      expect(UpdateProfileSchema.safeParse({ bio: "x".repeat(501) }).success).toBe(false)
    })
  })

  describe("campo phone", () => {
    it("aceita phone no formato +5584999991234", () => {
      expect(UpdateProfileSchema.safeParse({ phone: "+5584999991234" }).success).toBe(true)
    })

    it("aceita phone como null (remover telefone)", () => {
      expect(UpdateProfileSchema.safeParse({ phone: null }).success).toBe(true)
    })

    it("rejeita phone sem prefixo +55", () => {
      expect(UpdateProfileSchema.safeParse({ phone: "84999991234" }).success).toBe(false)
    })

    it("rejeita phone com dígitos insuficientes após +55", () => {
      expect(UpdateProfileSchema.safeParse({ phone: "+558499" }).success).toBe(false)
    })

    it("rejeita phone com letras", () => {
      expect(UpdateProfileSchema.safeParse({ phone: "+55849999abcd" }).success).toBe(false)
    })
  })

  describe("campo cep", () => {
    it("aceita CEP com 8 dígitos", () => {
      expect(UpdateProfileSchema.safeParse({ cep: "59000000" }).success).toBe(true)
    })

    it("aceita cep como null", () => {
      expect(UpdateProfileSchema.safeParse({ cep: null }).success).toBe(true)
    })

    it("rejeita CEP com menos de 8 dígitos", () => {
      expect(UpdateProfileSchema.safeParse({ cep: "5900000" }).success).toBe(false)
    })

    it("rejeita CEP com mais de 8 dígitos", () => {
      expect(UpdateProfileSchema.safeParse({ cep: "590000001" }).success).toBe(false)
    })

    it("rejeita CEP com hífen (deve ser somente dígitos)", () => {
      expect(UpdateProfileSchema.safeParse({ cep: "59000-000" }).success).toBe(false)
    })
  })

  describe("campo city", () => {
    it("aceita city com 2 caracteres (mínimo)", () => {
      expect(UpdateProfileSchema.safeParse({ city: "SP" }).success).toBe(true)
    })

    it("rejeita city com 1 caractere", () => {
      const r = UpdateProfileSchema.safeParse({ city: "S" })
      expect(r.success).toBe(false)
      if (!r.success) expect(r.error.issues.some((i) => i.path.includes("city"))).toBe(true)
    })
  })

  describe("campo state", () => {
    it("aceita estados brasileiros válidos", () => {
      for (const state of ["SP", "RJ", "MG", "PE", "RN", "DF"]) {
        expect(UpdateProfileSchema.safeParse({ state }).success).toBe(true)
      }
    })

    it("aceita state como null (limpar estado)", () => {
      expect(UpdateProfileSchema.safeParse({ state: null }).success).toBe(true)
    })

    it("rejeita estado inválido", () => {
      expect(UpdateProfileSchema.safeParse({ state: "XX" }).success).toBe(false)
    })
  })

  describe("campo avatarUrl", () => {
    it("aceita URL de avatar válida", () => {
      expect(
        UpdateProfileSchema.safeParse({
          avatarUrl: "https://storage.supabase.co/avatars/user123.jpg",
        }).success,
      ).toBe(true)
    })

    it("aceita avatarUrl como null (remover avatar)", () => {
      expect(UpdateProfileSchema.safeParse({ avatarUrl: null }).success).toBe(true)
    })

    it("rejeita string que não é URL", () => {
      expect(UpdateProfileSchema.safeParse({ avatarUrl: "nao-e-uma-url" }).success).toBe(false)
    })
  })

  describe("campo slug", () => {
    it("aceita slug válido em minúsculas com hífens", () => {
      expect(UpdateProfileSchema.safeParse({ slug: "minha-loja-2025" }).success).toBe(true)
    })

    it("rejeita slug com maiúsculas", () => {
      expect(UpdateProfileSchema.safeParse({ slug: "Minha-Loja" }).success).toBe(false)
    })

    it("rejeita slug que começa com hífen", () => {
      expect(UpdateProfileSchema.safeParse({ slug: "-minha-loja" }).success).toBe(false)
    })

    it("rejeita slug com mais de 50 caracteres", () => {
      expect(UpdateProfileSchema.safeParse({ slug: "a".repeat(51) }).success).toBe(false)
    })
  })

  describe("múltiplos campos simultâneos", () => {
    it("aceita atualização de name + city + state + bio juntos", () => {
      const r = UpdateProfileSchema.safeParse({
        name:  "Maria Lima",
        city:  "Recife",
        state: "PE",
        bio:   "Amo alugar ferramentas pelo ShareO!",
      })
      expect(r.success).toBe(true)
    })
  })
})
