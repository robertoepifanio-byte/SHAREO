/**
 * Carrinho de locação — Story B (ADR-025).
 *
 * Permite reunir vários itens do MESMO proprietário e enviar como UMA locação.
 * Vive 100% no client (localStorage) — é um rascunho de seleção; o preço e a
 * disponibilidade autoritativos são sempre recalculados no servidor no POST.
 *
 * Regra central: o carrinho é escopado a UM proprietário. Tentar adicionar um item
 * de outro dono exige esvaziar o carrinho antes (decisão de UX do componente).
 */

export interface CartItem {
  itemId:        string
  title:         string
  image:         string | null
  pricePerDay:   number
  pricePerWeek:  number | null
  pricePerMonth: number | null
  depositAmount: number | null
}

export interface Cart {
  ownerId:   string
  ownerName: string
  items:     CartItem[]
}

const KEY = "shareo:cart:v1"
const EVENT = "shareo:cart:change"

function isBrowser() {
  return typeof window !== "undefined"
}

export function getCart(): Cart | null {
  if (!isBrowser()) return null
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Cart
    if (!parsed?.ownerId || !Array.isArray(parsed.items)) return null
    return parsed
  } catch {
    return null
  }
}

function writeCart(cart: Cart | null) {
  if (!isBrowser()) return
  try {
    if (!cart || cart.items.length === 0) window.localStorage.removeItem(KEY)
    else window.localStorage.setItem(KEY, JSON.stringify(cart))
  } catch {
    // storage indisponível (modo privado, cota) — silencioso
  }
  // notifica componentes na mesma aba (o evento "storage" só dispara entre abas)
  window.dispatchEvent(new Event(EVENT))
}

export function cartCount(): number {
  return getCart()?.items.length ?? 0
}

export type AddResult = { ok: true } | { ok: false; reason: "DIFFERENT_OWNER" | "ALREADY_IN_CART" }

/**
 * Adiciona um item ao carrinho. Falha (sem alterar nada) se o item for de outro
 * proprietário — o chamador decide se esvazia o carrinho e tenta de novo.
 */
export function addToCart(ownerId: string, ownerName: string, item: CartItem): AddResult {
  const cart = getCart()
  if (cart && cart.ownerId !== ownerId) return { ok: false, reason: "DIFFERENT_OWNER" }
  if (cart?.items.some((i) => i.itemId === item.itemId)) return { ok: false, reason: "ALREADY_IN_CART" }
  const next: Cart = cart
    ? { ...cart, items: [...cart.items, item] }
    : { ownerId, ownerName, items: [item] }
  writeCart(next)
  return { ok: true }
}

export function removeFromCart(itemId: string) {
  const cart = getCart()
  if (!cart) return
  writeCart({ ...cart, items: cart.items.filter((i) => i.itemId !== itemId) })
}

export function clearCart() {
  writeCart(null)
}

/** Substitui o carrinho por um novo item (usado ao trocar de proprietário). */
export function replaceCart(ownerId: string, ownerName: string, item: CartItem) {
  writeCart({ ownerId, ownerName, items: [item] })
}

export const CART_CHANGE_EVENT = EVENT
