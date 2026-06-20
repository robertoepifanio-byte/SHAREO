"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Toaster } from "sonner"

/**
 * ThemedToaster — client leaf que sincroniza o Sonner com o tema ativo.
 *
 * Usa guard de montagem para evitar hydration mismatch: no SSR / 1.º render
 * o theme ainda é undefined (next-themes resolve após montar), então mantemos
 * theme="light" até o componente montar no cliente.
 */
export function ThemedToaster() {
  const [mounted, setMounted] = useState(false)
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <Toaster
      richColors
      position="top-right"
      theme={mounted ? (resolvedTheme === "dark" ? "dark" : "light") : "light"}
    />
  )
}
