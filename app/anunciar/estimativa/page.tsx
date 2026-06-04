import type { Metadata } from "next"
import { AppHeader } from "@/components/layout/AppHeader"

export const metadata: Metadata = {
  title: "Estimativa de Ganhos — ShareO",
  description: "Calcule quanto você pode ganhar anunciando seus itens no ShareO.",
}

export default function EstimativaPage() {
  return (
    <>
      <AppHeader />
      <main className="container py-16 flex flex-col items-center text-center gap-4">
        <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 uppercase tracking-wider">
          Em breve
        </span>
        <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">
          Estimativa de Ganhos
        </h1>
        <p className="max-w-md text-muted-foreground">
          Descubra quanto você pode ganhar alugando seus itens parados para a comunidade ShareO.
        </p>
      </main>
    </>
  )
}
