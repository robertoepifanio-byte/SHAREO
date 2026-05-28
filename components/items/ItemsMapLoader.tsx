"use client"

/**
 * ItemsMapLoader — thin client wrapper que carrega ItemsMap dinamicamente.
 *
 * next/dynamic com ssr:false só pode ser chamado em Client Components.
 * Este wrapper é importado pelo Server Component (app/page.tsx) como
 * um client boundary normal.
 */

import dynamic from "next/dynamic"
import type { ItemPin } from "./ItemsMap"

const ItemsMap = dynamic(
  () => import("./ItemsMap").then((m) => ({ default: m.ItemsMap })),
  {
    ssr: false,
    loading: () => (
      <div
        className="relative flex h-48 w-full items-center justify-center overflow-hidden rounded-lg border border-border bg-gradient-to-br from-[#ccd9e5] to-[#a8c0d4]"
        aria-hidden="true"
      >
        <span className="text-5xl">🗺️</span>
      </div>
    ),
  },
)

interface Props {
  items:   ItemPin[]
  height?: number
}

export function ItemsMapLoader({ items, height }: Props) {
  return <ItemsMap items={items} height={height} />
}
