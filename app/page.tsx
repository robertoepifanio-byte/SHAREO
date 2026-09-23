// Fonte: apps/campanha/components/PreLaunchHome.tsx — layout da campanha
// transcrito para a home real, todo CTA apontando para /cadastro em vez do
// formulário de lead. Ver plano da revisão pré-go-live (2026-09-22).
import type { Metadata } from "next"
import { AppHeader } from "@/components/layout/AppHeader"
import { Hero } from "@/components/home/landing/Hero"
import { ItensParados } from "@/components/home/landing/ItensParados"
import { DoisLados } from "@/components/home/landing/DoisLados"
import { ComoFunciona } from "@/components/home/landing/ComoFunciona"
import { QuantoVale } from "@/components/home/landing/QuantoVale"
import { Confianca } from "@/components/home/landing/Confianca"
import { Fundadores } from "@/components/home/landing/Fundadores"
import { Embaixadores } from "@/components/home/landing/Embaixadores"
import { Faq } from "@/components/home/landing/Faq"
import { Fechamento } from "@/components/home/landing/Fechamento"

export const metadata: Metadata = {
  title: "ShareO — Use Mais. Possua Menos.",
  description: "Alugue o que precisa de quem já tem. Marketplace de economia circular em todo o Brasil.",
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main>
        <Hero />
        <ItensParados />
        <DoisLados />
        <ComoFunciona />
        <QuantoVale />
        <Confianca />
        <Fundadores />
        <Embaixadores />
        <Faq />
        <Fechamento />
      </main>
    </div>
  )
}
