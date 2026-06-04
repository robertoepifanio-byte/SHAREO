import type { Metadata } from "next"
import Link from "next/link"
import { AppHeader } from "@/components/layout/AppHeader"
import { Calculadora } from "./_Calculadora"

export const metadata: Metadata = {
  title:       "Estimativa de Ganhos — ShareO",
  description: "Calcule quanto você pode ganhar alugando seus itens no ShareO.",
}

export default function EstimativaPage() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container py-8 max-w-3xl">

        {/* Hero */}
        <div className="mb-8 text-center">
          <span className="inline-block mb-3 rounded-full bg-brand/10 px-4 py-1.5 text-xs font-semibold text-brand uppercase tracking-wide">
            Para anfitriões
          </span>
          <h1 className="font-display text-3xl font-bold text-foreground mb-3">
            Quanto você pode ganhar?
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Simule seus ganhos alugando itens que ficam parados em casa.
            Renda extra sem burocracia.
          </p>
        </div>

        {/* Calculadora interativa */}
        <Calculadora />

        {/* Link para dicas */}
        <div className="mt-8 rounded-xl border border-border bg-muted/40 px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Quer maximizar seus ganhos?</p>
            <p className="text-xs text-muted-foreground mt-0.5">Veja as dicas de quem já aluga com sucesso no ShareO.</p>
          </div>
          <Link
            href="/anunciar/dicas"
            className="flex-shrink-0 inline-flex h-9 items-center rounded-lg border border-brand px-4 text-sm font-medium text-brand hover:bg-brand/5 transition-colors whitespace-nowrap"
          >
            Ver dicas →
          </Link>
        </div>

      </main>
    </div>
  )
}
