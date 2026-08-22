/**
 * Testes unitários para lib/validations/items.ts
 *
 * Schemas cobertos:
 *  - CreateItemSchema
 *  - UpdateItemSchema (partial de CreateItem + isActive/status)
 *  - ListItemsQuerySchema
 */

import {
  CreateItemSchema,
  UpdateItemSchema,
  ListItemsQuerySchema,
} from "@/lib/validations/items"
import { MAX_ITEM_VALUE_CENTS } from "@/lib/platform-config"
import { formatPriceShort } from "@/utils/format"

// ---------------------------------------------------------------------------
// Base válido
// ---------------------------------------------------------------------------

const BASE_ITEM = {
  title:       "Furadeira de Impacto Bosch",
  description: "Furadeira em ótimo estado, perfeita para pequenas obras e reformas domésticas.",
  categoryId:  "cat-ferramentas-01",
  condition:   "GOOD" as const,
  pricePerDay: 3_500, // R$ 35,00 em centavos
  city:        "Recife",
  state:       "PE" as const,
  latitude:    -8.0476,
  longitude:   -34.877,
}

// ---------------------------------------------------------------------------
// CreateItemSchema
// ---------------------------------------------------------------------------

describe("CreateItemSchema", () => {
  describe("caso válido", () => {
    it("aceita payload mínimo válido", () => {
      expect(CreateItemSchema.safeParse(BASE_ITEM).success).toBe(true)
    })

    it("aceita payload completo com campos opcionais", () => {
      const result = CreateItemSchema.safeParse({
        ...BASE_ITEM,
        pricePerWeek:  10_000,
        pricePerMonth: 40_000,
        depositAmount: 5_000,
        estimatedRetailPrice: 80_000,
        address:       "Rua das Flores, 123",
        neighborhood:  "Boa Viagem",
        voltage:       "Bivolt",
        requireIdVerification: true,
        requirePhone:  false,
      })
      expect(result.success).toBe(true)
    })

    it("aceita todas as condições válidas", () => {
      const conditions = ["NEW", "EXCELLENT", "GOOD", "FAIR"] as const
      for (const condition of conditions) {
        expect(CreateItemSchema.safeParse({ ...BASE_ITEM, condition }).success).toBe(true)
      }
    })

    it("aceita todos os estados brasileiros", () => {
      const states = ["SP", "RJ", "MG", "BA", "RS", "DF"] as const
      for (const state of states) {
        expect(CreateItemSchema.safeParse({ ...BASE_ITEM, state }).success).toBe(true)
      }
    })

    it("address como string vazia é transformado para undefined", () => {
      const result = CreateItemSchema.safeParse({ ...BASE_ITEM, address: "" })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.address).toBeUndefined()
      }
    })
  })

  describe("campos obrigatórios ausentes", () => {
    it("rejeita sem title", () => {
      const { title: _, ...rest } = BASE_ITEM
      void _
      expect(CreateItemSchema.safeParse(rest).success).toBe(false)
    })

    it("rejeita sem description", () => {
      const { description: _, ...rest } = BASE_ITEM
      void _
      expect(CreateItemSchema.safeParse(rest).success).toBe(false)
    })

    it("rejeita sem categoryId", () => {
      const { categoryId: _, ...rest } = BASE_ITEM
      void _
      expect(CreateItemSchema.safeParse(rest).success).toBe(false)
    })

    it("rejeita sem condition", () => {
      const { condition: _, ...rest } = BASE_ITEM
      void _
      expect(CreateItemSchema.safeParse(rest).success).toBe(false)
    })

    it("rejeita sem pricePerDay", () => {
      const { pricePerDay: _, ...rest } = BASE_ITEM
      void _
      expect(CreateItemSchema.safeParse(rest).success).toBe(false)
    })

    it("rejeita sem city", () => {
      const { city: _, ...rest } = BASE_ITEM
      void _
      expect(CreateItemSchema.safeParse(rest).success).toBe(false)
    })

    it("rejeita sem state", () => {
      const { state: _, ...rest } = BASE_ITEM
      void _
      expect(CreateItemSchema.safeParse(rest).success).toBe(false)
    })

    it("rejeita sem latitude", () => {
      const { latitude: _, ...rest } = BASE_ITEM
      void _
      expect(CreateItemSchema.safeParse(rest).success).toBe(false)
    })

    it("rejeita sem longitude", () => {
      const { longitude: _, ...rest } = BASE_ITEM
      void _
      expect(CreateItemSchema.safeParse(rest).success).toBe(false)
    })
  })

  describe("validação de title", () => {
    it("rejeita title com menos de 5 caracteres", () => {
      const r = CreateItemSchema.safeParse({ ...BASE_ITEM, title: "Abc" })
      expect(r.success).toBe(false)
      if (!r.success) expect(r.error.issues.some((i) => i.path.includes("title"))).toBe(true)
    })

    it("rejeita title com mais de 120 caracteres", () => {
      expect(CreateItemSchema.safeParse({ ...BASE_ITEM, title: "A".repeat(121) }).success).toBe(false)
    })

    it("aceita title com exatamente 5 caracteres", () => {
      expect(CreateItemSchema.safeParse({ ...BASE_ITEM, title: "Abcde" }).success).toBe(true)
    })
  })

  describe("validação de description", () => {
    it("rejeita description com menos de 20 caracteres", () => {
      expect(CreateItemSchema.safeParse({ ...BASE_ITEM, description: "Muito curta" }).success).toBe(false)
    })

    it("rejeita description com mais de 2000 caracteres", () => {
      expect(CreateItemSchema.safeParse({ ...BASE_ITEM, description: "A".repeat(2001) }).success).toBe(false)
    })
  })

  describe("validação de pricePerDay", () => {
    it("rejeita pricePerDay abaixo de 100 (R$ 1,00)", () => {
      const r = CreateItemSchema.safeParse({ ...BASE_ITEM, pricePerDay: 99 })
      expect(r.success).toBe(false)
      if (!r.success) expect(r.error.issues.some((i) => i.path.includes("pricePerDay"))).toBe(true)
    })

    it("aceita pricePerDay exatamente 100 centavos (R$ 1,00)", () => {
      expect(CreateItemSchema.safeParse({ ...BASE_ITEM, pricePerDay: 100 }).success).toBe(true)
    })

    it("rejeita pricePerDay fracionado (não inteiro)", () => {
      expect(CreateItemSchema.safeParse({ ...BASE_ITEM, pricePerDay: 100.5 }).success).toBe(false)
    })
  })

  describe("validação de condition", () => {
    it("rejeita condition fora do enum", () => {
      expect(CreateItemSchema.safeParse({ ...BASE_ITEM, condition: "RUIM" }).success).toBe(false)
    })
  })

  describe("validação de state", () => {
    it("rejeita estado inválido ('XX')", () => {
      expect(CreateItemSchema.safeParse({ ...BASE_ITEM, state: "XX" }).success).toBe(false)
    })
  })

  describe("validação de coordenadas", () => {
    it("rejeita latitude fora de [-90, 90]", () => {
      expect(CreateItemSchema.safeParse({ ...BASE_ITEM, latitude: 91 }).success).toBe(false)
      expect(CreateItemSchema.safeParse({ ...BASE_ITEM, latitude: -91 }).success).toBe(false)
    })

    it("rejeita longitude fora de [-180, 180]", () => {
      expect(CreateItemSchema.safeParse({ ...BASE_ITEM, longitude: 181 }).success).toBe(false)
      expect(CreateItemSchema.safeParse({ ...BASE_ITEM, longitude: -181 }).success).toBe(false)
    })
  })

  describe("validação de voltage", () => {
    it("aceita valores válidos de voltage", () => {
      for (const v of ["110V", "220V", "Bivolt"] as const) {
        expect(CreateItemSchema.safeParse({ ...BASE_ITEM, voltage: v }).success).toBe(true)
      }
    })

    it("rejeita voltage inválido", () => {
      expect(CreateItemSchema.safeParse({ ...BASE_ITEM, voltage: "380V" }).success).toBe(false)
    })
  })
})

// ---------------------------------------------------------------------------
// UpdateItemSchema
// ---------------------------------------------------------------------------

/**
 * Teto do valor do bem — regra da fase inicial, publicada em /ajuda e /politicas.
 *
 * Até 22/08/2026 existia só no texto: `estimatedRetailPrice` aceitava qualquer
 * valor >= 0, e a Central de Ajuda afirmava que itens acima de R$ 1.000 "não
 * podem ser anunciados". A auditoria de pagamento pegou a divergência.
 */
describe("teto de valor do bem (MAX_ITEM_VALUE_CENTS)", () => {
  it("aceita item exatamente no teto", () => {
    const r = CreateItemSchema.safeParse({ ...BASE_ITEM, estimatedRetailPrice: MAX_ITEM_VALUE_CENTS })
    expect(r.success).toBe(true)
  })

  it("recusa item acima do teto, com o valor formatado na mensagem", () => {
    const r = CreateItemSchema.safeParse({ ...BASE_ITEM, estimatedRetailPrice: MAX_ITEM_VALUE_CENTS + 1 })
    expect(r.success).toBe(false)
    if (!r.success) {
      // Formatado como no resto do site ("R$ 1.000"), não cru ("R$ 1000").
      expect(r.error.issues[0].message).toContain(formatPriceShort(MAX_ITEM_VALUE_CENTS))
    }
  })

  it("aceita null — o campo não virou obrigatório", () => {
    expect(CreateItemSchema.safeParse({ ...BASE_ITEM, estimatedRetailPrice: null }).success).toBe(true)
  })

  it("o SCHEMA de edição não carrega o teto — quem decide é a rota", () => {
    // 🪤 Não confundir com "a edição aceita qualquer valor". O schema é
    // permissivo de propósito porque a regra da edição é de NÃO-REGRESSÃO e
    // precisa do valor ATUAL do item, que só a rota conhece (PUT
    // /api/items/[id]): aceita dentro do teto OU não maior que o que já está lá.
    //
    // Herdar o `.max()` aqui travaria os anúncios legados — 59 dos 92 itens do
    // staging já estavam acima do teto quando a regra entrou, e o dono nem
    // conseguiria corrigir o título.
    const r = UpdateItemSchema.safeParse({ estimatedRetailPrice: MAX_ITEM_VALUE_CENTS * 8 })
    expect(r.success).toBe(true)
  })
})

describe("UpdateItemSchema", () => {
  it("aceita objeto vazio (todos os campos são opcionais em update)", () => {
    expect(UpdateItemSchema.safeParse({}).success).toBe(true)
  })

  it("aceita atualização parcial de title apenas", () => {
    expect(UpdateItemSchema.safeParse({ title: "Novo título do item" }).success).toBe(true)
  })

  it("aceita campo isActive (retrocompatibilidade)", () => {
    expect(UpdateItemSchema.safeParse({ isActive: true }).success).toBe(true)
    expect(UpdateItemSchema.safeParse({ isActive: false }).success).toBe(true)
  })

  it("aceita campo status com valores válidos", () => {
    expect(UpdateItemSchema.safeParse({ status: "AVAILABLE" }).success).toBe(true)
    expect(UpdateItemSchema.safeParse({ status: "PAUSED" }).success).toBe(true)
  })

  it("rejeita status inválido", () => {
    expect(UpdateItemSchema.safeParse({ status: "DELETED" }).success).toBe(false)
  })

  it("rejeita title muito curto em update", () => {
    expect(UpdateItemSchema.safeParse({ title: "Ab" }).success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// ListItemsQuerySchema
// ---------------------------------------------------------------------------

describe("ListItemsQuerySchema", () => {
  describe("defaults", () => {
    it("aplica page=1 e limit=20 por padrão", () => {
      const r = ListItemsQuerySchema.safeParse({})
      expect(r.success).toBe(true)
      if (r.success) {
        expect(r.data.page).toBe(1)
        expect(r.data.limit).toBe(20)
      }
    })
  })

  describe("coerce de strings numéricas (query string)", () => {
    it("converte page='3' para 3", () => {
      const r = ListItemsQuerySchema.safeParse({ page: "3", limit: "10" })
      expect(r.success).toBe(true)
      if (r.success) {
        expect(r.data.page).toBe(3)
        expect(r.data.limit).toBe(10)
      }
    })

    it("converte minPrice e maxPrice de string para number", () => {
      const r = ListItemsQuerySchema.safeParse({ minPrice: "100", maxPrice: "5000" })
      expect(r.success).toBe(true)
      if (r.success) {
        expect(r.data.minPrice).toBe(100)
        expect(r.data.maxPrice).toBe(5000)
      }
    })
  })

  describe("limites válidos", () => {
    it("aceita limit máximo de 100", () => {
      // Teto elevado 50 → 100: o app mobile pede mais itens quando há filtros
      // client-side (distância/avaliação, aplicados em JS pós-fetch como no site).
      expect(ListItemsQuerySchema.safeParse({ limit: "100" }).success).toBe(true)
    })

    it("rejeita limit acima de 100", () => {
      expect(ListItemsQuerySchema.safeParse({ limit: "101" }).success).toBe(false)
    })

    it("rejeita page menor que 1", () => {
      expect(ListItemsQuerySchema.safeParse({ page: "0" }).success).toBe(false)
    })
  })

  describe("filtros opcionais", () => {
    it("aceita filtros de texto", () => {
      const r = ListItemsQuerySchema.safeParse({ search: "furadeira", city: "Recife", state: "PE" })
      expect(r.success).toBe(true)
    })

    it("rejeita search com mais de 100 caracteres", () => {
      expect(ListItemsQuerySchema.safeParse({ search: "x".repeat(101) }).success).toBe(false)
    })
  })
})
