import type { Metadata } from "next"
import { AppHeader } from "@/components/layout/AppHeader"

export const metadata: Metadata = {
  title: "Sobre Nós — ShareO",
  description: "Conheça a história, missão e valores do ShareO, o marketplace de economia circular.",
}

export default function SobrePage() {
  return (
    <>
      <AppHeader />
      <main className="container py-16 flex flex-col items-center text-center gap-4">
        <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 uppercase tracking-wider">
          Em breve
        </span>
        <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">
          Sobre Nós
        </h1>
        <p className="max-w-md text-muted-foreground">
          O ShareO nasceu da crença de que compartilhar é melhor do que possuir. Conheça nossa história e missão.
        </p>
      </main>
    </>
  )
}
