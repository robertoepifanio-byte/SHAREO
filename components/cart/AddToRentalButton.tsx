"use client"

import { useState } from "react"
import Link from "next/link"
import { addToCart, replaceCart, type CartItem } from "@/lib/cart"
import { useCart } from "@/components/cart/useCart"

interface Props {
  ownerId:   string
  ownerName: string
  item:      CartItem
}

/**
 * Adiciona o item a uma locação multi-item do MESMO anunciante (Story B).
 * O período é escolhido depois, no /carrinho. Não interfere no botão principal
 * "Solicitar locação" (item único imediato) — é um caminho alternativo.
 */
export function AddToRentalButton({ ownerId, ownerName, item }: Props) {
  const { cart, count } = useCart()
  const [msg, setMsg] = useState<string | null>(null)

  const inCart = cart?.items.some((i) => i.itemId === item.itemId) ?? false
  const sameOwnerCount = cart?.ownerId === ownerId ? count : 0

  function handleAdd() {
    setMsg(null)
    const res = addToCart(ownerId, ownerName, item)
    if (res.ok) return
    if (res.reason === "ALREADY_IN_CART") {
      setMsg("Este item já está na sua locação.")
      return
    }
    // Carrinho tem itens de outro anunciante
    const trocar = window.confirm(
      "Sua locação já tem itens de outro anunciante. Deseja esvaziar e começar uma nova locação com este item?",
    )
    if (trocar) replaceCart(ownerId, ownerName, item)
  }

  return (
    <div className="mb-2.5">
      {inCart ? (
        <Link
          href="/carrinho"
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-brand bg-brand/5 py-3 text-sm font-semibold text-brand hover:bg-brand/10 transition-colors"
        >
          ✓ Na sua locação · Ver carrinho{sameOwnerCount > 0 ? ` (${sameOwnerCount})` : ""} →
        </Link>
      ) : (
        <button
          type="button"
          onClick={handleAdd}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-border py-3 text-sm font-semibold text-foreground hover:border-brand/40 hover:bg-brand/5 transition-colors"
        >
          ➕ Adicionar a uma locação
        </button>
      )}

      {msg && <p className="mt-1.5 text-xs text-muted-foreground">{msg}</p>}

      {!inCart && (
        <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
          Junte vários itens deste anunciante e alugue tudo numa só locação.
          {sameOwnerCount > 0 && (
            <>
              {" "}
              <Link href="/carrinho" className="font-semibold text-brand hover:underline">
                Ver carrinho ({sameOwnerCount}) →
              </Link>
            </>
          )}
        </p>
      )}
    </div>
  )
}
