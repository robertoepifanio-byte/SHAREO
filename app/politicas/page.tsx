import type { Metadata } from "next"
import { AppHeader } from "@/components/layout/AppHeader"

export const metadata: Metadata = {
  title: "Políticas e Regras — ShareO",
  description: "Conheça as políticas e regras que regem o uso da plataforma ShareO.",
}

export default function PoliticasPage() {
  return (
    <>
      <AppHeader />
      <main className="container py-16 flex flex-col items-center text-center gap-4">
        <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 uppercase tracking-wider">
          Em breve
        </span>
        <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">
          Políticas e Regras
        </h1>
        <p className="max-w-md text-muted-foreground">
          Diretrizes de uso, regras da comunidade e políticas de cancelamento e disputa do ShareO.
        </p>
      </main>
    </>
  )
}
