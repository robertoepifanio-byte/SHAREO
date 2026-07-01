/**
 * Testes unitários para lib/slugify.ts
 *
 * Funções cobertas:
 *  - generateUserSlug — slug de vitrine do usuário (nome + 6 últimos chars do ID)
 *  - isValidSlug     — validação de slug customizado
 */

import { generateUserSlug, isValidSlug } from "@/lib/slugify"

// ---------------------------------------------------------------------------
// generateUserSlug
// ---------------------------------------------------------------------------

describe("generateUserSlug", () => {
  describe("formato geral", () => {
    it("retorna string não vazia", () => {
      const slug = generateUserSlug("Maria Silva", "abc123xyz")
      expect(slug.length).toBeGreaterThan(0)
    })

    it("termina com os 6 últimos caracteres do ID", () => {
      const id = "clh3z2v0000001p68fxyz1234"
      const slug = generateUserSlug("João", id)
      expect(slug.endsWith(id.slice(-6))).toBe(true)
    })

    it("base e sufixo são separados por hífen", () => {
      const slug = generateUserSlug("Pedro", "abc123xyz")
      const parts = slug.split("-")
      expect(parts.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe("normalização de caracteres", () => {
    it("converte para minúsculas", () => {
      const slug = generateUserSlug("MARIA SILVA", "abc123xyz")
      expect(slug).toBe(slug.toLowerCase())
    })

    it("remove acentos (ã, é, ç, ú, â, etc.)", () => {
      const slug = generateUserSlug("João Ação", "abc123xyz")
      expect(slug).not.toMatch(/[ãáàâéêíóôõúüç]/)
    })

    it("substitui espaços por hífens", () => {
      const slug = generateUserSlug("Maria Silva", "id000001")
      // O nome sem sufixo deve usar hífens no lugar de espaços
      expect(slug).toContain("-")
      expect(slug).not.toContain(" ")
    })

    it("remove caracteres especiais (@, #, !, etc.)", () => {
      const slug = generateUserSlug("João@Silva#2025!", "abc123xyz")
      expect(slug).not.toMatch(/[@#!]/)
    })

    it("hífens consecutivos são colapsados em um único hífen", () => {
      const slug = generateUserSlug("Ana  Clara   Santos", "abc123xyz")
      expect(slug).not.toMatch(/--/)
    })
  })

  describe("limite de comprimento", () => {
    it("base não ultrapassa 40 caracteres (sufixo separado)", () => {
      const longName = "A".repeat(60)
      const slug = generateUserSlug(longName, "id000001")
      // sufixo = "-id0001" (7 chars), base <= 40
      const [base] = slug.split(/-[^-]+$/)
      expect(base!.length).toBeLessThanOrEqual(40)
    })
  })

  describe("unicidade por ID", () => {
    it("IDs diferentes produzem slugs diferentes mesmo com nome igual", () => {
      const slug1 = generateUserSlug("Ana Lima", "id111111")
      const slug2 = generateUserSlug("Ana Lima", "id222222")
      expect(slug1).not.toBe(slug2)
    })
  })

  describe("casos extremos de nome", () => {
    it("nome com apenas dígitos gera slug com sufixo", () => {
      const slug = generateUserSlug("12345", "abc123xyz")
      expect(slug.length).toBeGreaterThan(0)
      expect(slug).not.toContain(" ")
    })

    it("nome com caracteres apenas especiais resulta em base vazia + sufixo", () => {
      // Após strip: base pode ficar vazia; o sufixo ainda é adicionado
      const slug = generateUserSlug("@@@", "abc123xyz")
      // Pelo menos o separador + sufixo (6 chars)
      expect(slug).toContain("abc123xyz".slice(-6))
    })
  })
})

// ---------------------------------------------------------------------------
// isValidSlug
// ---------------------------------------------------------------------------

describe("isValidSlug", () => {
  describe("slugs válidos", () => {
    it("aceita slug simples em minúsculas", () => {
      expect(isValidSlug("minha-loja")).toBe(true)
    })

    it("aceita slug só com letras e números", () => {
      expect(isValidSlug("loja123")).toBe(true)
    })

    it("aceita slug com dígitos no meio", () => {
      expect(isValidSlug("loja-do-joao-2025")).toBe(true)
    })

    it("aceita slug de comprimento mínimo (3 chars)", () => {
      expect(isValidSlug("abc")).toBe(true)
    })

    it("aceita slug de comprimento máximo (50 chars)", () => {
      // Deve iniciar e terminar com letra/número; hífens só no meio
      expect(isValidSlug("a" + "-b".repeat(24))).toBe(true)
    })
  })

  describe("slugs inválidos", () => {
    it("rejeita slug com letra maiúscula", () => {
      expect(isValidSlug("Minha-Loja")).toBe(false)
    })

    it("rejeita slug com espaço", () => {
      expect(isValidSlug("minha loja")).toBe(false)
    })

    it("rejeita slug com caractere especial (@, #, etc.)", () => {
      expect(isValidSlug("minha@loja")).toBe(false)
    })

    it("rejeita slug com menos de 3 caracteres", () => {
      expect(isValidSlug("ab")).toBe(false)
    })

    it("rejeita slug com mais de 50 caracteres", () => {
      expect(isValidSlug("a".repeat(51))).toBe(false)
    })

    it("rejeita slug que começa com hífen", () => {
      expect(isValidSlug("-minha-loja")).toBe(false)
    })

    it("rejeita slug que termina com hífen", () => {
      expect(isValidSlug("minha-loja-")).toBe(false)
    })

    it("rejeita string vazia", () => {
      expect(isValidSlug("")).toBe(false)
    })
  })
})
