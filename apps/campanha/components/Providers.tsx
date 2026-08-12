"use client"

import { ThemeProvider } from "next-themes"
import type { ReactNode } from "react"

/**
 * Só o ThemeProvider.
 *
 * O Providers do app principal envolve também um SessionProvider do NextAuth —
 * aqui não existe sessão, login nem usuário: a landing é anônima por definição.
 * Arrastar o NextAuth para cá traria a dependência inteira (e suas 3 CVEs de
 * agosto) para um app que nunca autentica ninguém.
 */
export function Providers({ children, nonce }: { children: ReactNode; nonce?: string }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      nonce={nonce}
    >
      {children}
    </ThemeProvider>
  )
}
