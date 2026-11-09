"use client"

import Link from "next/link"
import type { ComponentProps } from "react"
import { guardarOrigemDoAnuncio } from "@/lib/origem-anuncio"

/** Link para um anúncio que lembra a página de origem (ver lib/origem-anuncio.ts). */
export function AnuncioLink({ onClick, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      {...props}
      onClick={(e) => {
        guardarOrigemDoAnuncio()
        onClick?.(e)
      }}
    />
  )
}
