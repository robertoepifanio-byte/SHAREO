// Fonte: apps/mobile/lib/rentalCart.ts
// Testa a lógica pura do carrinho de locação multi-item (Story B / ADR-025).
// Regras de negócio idênticas ao lib/cart.ts do site:
//   • um carrinho = um proprietário
//   • DIFFERENT_OWNER / ALREADY_IN_CART retornados como tipos, não throws
// AsyncStorage é mockado no jest.setup.js (in-memory Map).
// Zustand é reset entre testes via setState.

import { useRentalCart, type RentalCartItem } from "@/lib/rentalCart"

// ── Fixtures ──────────────────────────────────────────────────────────────────

const ITEM_A: RentalCartItem = {
  itemId:        "item-a",
  title:         "Furadeira Bosch 650W",
  image:         null,
  pricePerDay:   3500,
  pricePerWeek:  null,
  pricePerMonth: null,
  depositAmount: null,
}

const ITEM_B: RentalCartItem = {
  itemId:        "item-b",
  title:         "Projetor Epson EB-X51",
  image:         null,
  pricePerDay:   10000,
  pricePerWeek:  null,
  pricePerMonth: null,
  depositAmount: null,
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  // Reseta o estado Zustand entre testes — garante isolamento completo
  useRentalCart.setState({ cart: null, loaded: false })
})

// ── add() ─────────────────────────────────────────────────────────────────────

describe("rentalCart — add()", () => {
  it("retorna { ok: true } ao adicionar primeiro item ao carrinho vazio", () => {
    const result = useRentalCart.getState().add("owner-1", "Carlos", ITEM_A)
    expect(result).toEqual({ ok: true })
  })

  it("cart contém o item após add() bem-sucedido", () => {
    useRentalCart.getState().add("owner-1", "Carlos", ITEM_A)
    const { cart } = useRentalCart.getState()
    expect(cart?.ownerId).toBe("owner-1")
    expect(cart?.ownerName).toBe("Carlos")
    expect(cart?.items).toHaveLength(1)
    expect(cart?.items[0].itemId).toBe("item-a")
  })

  it("retorna { ok: true } ao adicionar segundo item do MESMO dono", () => {
    useRentalCart.getState().add("owner-1", "Carlos", ITEM_A)
    const result = useRentalCart.getState().add("owner-1", "Carlos", ITEM_B)
    expect(result).toEqual({ ok: true })
  })

  it("retorna { ok: false, reason: 'ALREADY_IN_CART' } para item duplicado", () => {
    useRentalCart.getState().add("owner-1", "Carlos", ITEM_A)
    const result = useRentalCart.getState().add("owner-1", "Carlos", ITEM_A)
    expect(result).toEqual({ ok: false, reason: "ALREADY_IN_CART" })
  })

  it("retorna { ok: false, reason: 'DIFFERENT_OWNER' } ao tentar adicionar item de outro dono", () => {
    useRentalCart.getState().add("owner-1", "Carlos", ITEM_A)
    const result = useRentalCart.getState().add("owner-2", "Maria", ITEM_B)
    expect(result).toEqual({ ok: false, reason: "DIFFERENT_OWNER" })
  })

  it("não muta o carrinho quando ALREADY_IN_CART — mantém 1 item", () => {
    useRentalCart.getState().add("owner-1", "Carlos", ITEM_A)
    useRentalCart.getState().add("owner-1", "Carlos", ITEM_A)
    expect(useRentalCart.getState().cart?.items).toHaveLength(1)
  })

  it("não muta o carrinho quando DIFFERENT_OWNER — mantém o item original", () => {
    useRentalCart.getState().add("owner-1", "Carlos", ITEM_A)
    useRentalCart.getState().add("owner-2", "Maria", ITEM_B)
    const { cart } = useRentalCart.getState()
    expect(cart?.ownerId).toBe("owner-1")
    expect(cart?.items[0].itemId).toBe("item-a")
  })
})

// ── replace() ─────────────────────────────────────────────────────────────────

describe("rentalCart — replace()", () => {
  it("substitui carrinho existente por nova locação de outro dono", () => {
    useRentalCart.getState().add("owner-1", "Carlos", ITEM_A)
    useRentalCart.getState().replace("owner-2", "Maria", ITEM_B)
    const { cart } = useRentalCart.getState()
    expect(cart?.ownerId).toBe("owner-2")
    expect(cart?.ownerName).toBe("Maria")
    expect(cart?.items).toHaveLength(1)
    expect(cart?.items[0].itemId).toBe("item-b")
  })

  it("replace() em carrinho vazio cria novo carrinho", () => {
    useRentalCart.getState().replace("owner-1", "Carlos", ITEM_A)
    const { cart } = useRentalCart.getState()
    expect(cart?.ownerId).toBe("owner-1")
    expect(cart?.items[0].itemId).toBe("item-a")
  })
})

// ── remove() e clear() ────────────────────────────────────────────────────────

describe("rentalCart — remove() e clear()", () => {
  it("remove() elimina item específico pelo itemId", () => {
    useRentalCart.getState().add("owner-1", "Carlos", ITEM_A)
    useRentalCart.getState().add("owner-1", "Carlos", ITEM_B)
    useRentalCart.getState().remove("item-a")
    const { cart } = useRentalCart.getState()
    expect(cart?.items).toHaveLength(1)
    expect(cart?.items[0].itemId).toBe("item-b")
  })

  it("remove() em carrinho vazio não dispara erro", () => {
    expect(() => useRentalCart.getState().remove("item-x")).not.toThrow()
  })

  it("clear() esvazia o carrinho — cart retorna null", () => {
    useRentalCart.getState().add("owner-1", "Carlos", ITEM_A)
    useRentalCart.getState().clear()
    expect(useRentalCart.getState().cart).toBeNull()
  })
})
