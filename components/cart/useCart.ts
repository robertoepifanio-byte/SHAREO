"use client"

import { useCallback, useEffect, useState } from "react"
import { getCart, CART_CHANGE_EVENT, type Cart } from "@/lib/cart"

/**
 * Hook que expõe o carrinho (localStorage) de forma reativa: re-renderiza ao mudar
 * na mesma aba (evento CART_CHANGE_EVENT) ou entre abas (evento nativo "storage").
 * `hydrated` evita mismatch de SSR (no servidor o carrinho é sempre null).
 */
export function useCart() {
  const [cart, setCart] = useState<Cart | null>(null)
  const [hydrated, setHydrated] = useState(false)

  const refresh = useCallback(() => setCart(getCart()), [])

  useEffect(() => {
    refresh()
    setHydrated(true)
    const onChange = () => refresh()
    window.addEventListener(CART_CHANGE_EVENT, onChange)
    window.addEventListener("storage", onChange)
    return () => {
      window.removeEventListener(CART_CHANGE_EVENT, onChange)
      window.removeEventListener("storage", onChange)
    }
  }, [refresh])

  return { cart, count: cart?.items.length ?? 0, hydrated, refresh }
}
