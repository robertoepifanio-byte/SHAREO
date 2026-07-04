// Fonte: lib/cart.ts (site) + components/cart/useCart.ts (site)
// Equivalente mobile do carrinho de locação multi-item (Story B — ADR-025).
//
// A versão web usa localStorage + window events (não disponíveis no RN).
// Aqui: Zustand (já instalado, ^4.5.0) + AsyncStorage (já instalado, ^2.1.0).
// A interface CartItem/Cart e as regras de negócio são IDÊNTICAS ao lib/cart.ts:
//   • um carrinho = um proprietário
//   • adicionar item de outro dono → retorna DIFFERENT_OWNER (chamador decide)
//   • item já no carrinho → retorna ALREADY_IN_CART

import { create } from "zustand"
import AsyncStorage from "@react-native-async-storage/async-storage"

// Mesma interface de CartItem de lib/cart.ts — verbatim
export interface RentalCartItem {
  itemId:        string
  title:         string
  image:         string | null
  pricePerDay:   number
  pricePerWeek:  number | null
  pricePerMonth: number | null
  depositAmount: number | null
}

export interface RentalCart {
  ownerId:   string
  ownerName: string
  items:     RentalCartItem[]
}

// Mesmo tipo de retorno que AddResult em lib/cart.ts
export type RentalAddResult =
  | { ok: true }
  | { ok: false; reason: "DIFFERENT_OWNER" | "ALREADY_IN_CART" }

interface RentalCartState {
  cart:    RentalCart | null
  loaded:  boolean
  /** Carrega do AsyncStorage. Idempotente — ignora se `loaded` já for true. */
  load:    () => Promise<void>
  /** Adiciona item. Retorna erro tipado em vez de throw — chamador exibe Alert. */
  add:     (ownerId: string, ownerName: string, item: RentalCartItem) => RentalAddResult
  /** Substitui o carrinho por novo item (aceito pelo usuário após diálogo). */
  replace: (ownerId: string, ownerName: string, item: RentalCartItem) => void
  remove:  (itemId: string) => void
  clear:   () => void
}

const STORAGE_KEY = "shareo:cart:v1"

/** Persiste no AsyncStorage de forma fire-and-forget (igual ao writeCart do site). */
async function persistCart(cart: RentalCart | null) {
  try {
    if (!cart || cart.items.length === 0) {
      await AsyncStorage.removeItem(STORAGE_KEY)
    } else {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cart))
    }
  } catch {
    // Silencioso — cota de storage ou modo privado, exatamente como no site
  }
}

export const useRentalCart = create<RentalCartState>((set, get) => ({
  cart:   null,
  loaded: false,

  load: async () => {
    if (get().loaded) return   // idempotente
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as RentalCart
        if (parsed?.ownerId && Array.isArray(parsed.items)) {
          set({ cart: parsed, loaded: true })
          return
        }
      }
    } catch {
      // Silencioso — JSON corrompido ou storage indisponível
    }
    set({ cart: null, loaded: true })
  },

  add: (ownerId, ownerName, item) => {
    const { cart } = get()
    if (cart && cart.ownerId !== ownerId)
      return { ok: false, reason: "DIFFERENT_OWNER" }
    if (cart?.items.some((i) => i.itemId === item.itemId))
      return { ok: false, reason: "ALREADY_IN_CART" }
    const next: RentalCart = cart
      ? { ...cart, items: [...cart.items, item] }
      : { ownerId, ownerName, items: [item] }
    set({ cart: next })
    void persistCart(next)
    return { ok: true }
  },

  replace: (ownerId, ownerName, item) => {
    const next: RentalCart = { ownerId, ownerName, items: [item] }
    set({ cart: next })
    void persistCart(next)
  },

  remove: (itemId) => {
    const { cart } = get()
    if (!cart) return
    const next = { ...cart, items: cart.items.filter((i) => i.itemId !== itemId) }
    set({ cart: next })
    void persistCart(next)
  },

  clear: () => {
    set({ cart: null })
    void persistCart(null)
  },
}))
