import type { Metadata } from "next"
import { AppHeader } from "@/components/layout/AppHeader"

export const metadata: Metadata = {
  title: "Suporte 24/7 — ShareO",
  description: "Entre em contato com o suporte do ShareO a qualquer momento.",
}

export default function SuportePage() {
  return (
    <>
      <AppHeader />
      <main className="container py-16 flex flex-col items-center text-center gap-4">
        <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 uppercase tracking-wider">
          Em breve
        </span>
        <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">
          Suporte 24/7
        </h1>
        <p className="max-w-md text-muted-foreground">
          Nossa equipe está disponível a qualquer hora para ajudar você com dúvidas, problemas e disputas.
        </p>
      </main>
    </>
  )
}
