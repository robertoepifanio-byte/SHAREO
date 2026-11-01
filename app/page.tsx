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
import { FAQ } from "@/lib/landing-content"
import { jsonLdScript } from "@/lib/jsonLd"

export const metadata: Metadata = {
  title: { absolute: "Aluguel de ferramentas, câmeras e bikes entre pessoas | ShareO" },
  description:
    "Alugue furadeira, câmera, bicicleta e mais de quem mora perto de você, ou ganhe dinheiro alugando o que está parado. Cadastre-se grátis no ShareO.",
}

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type":    "FAQPage",
  mainEntity: FAQ.map((f) => ({
    "@type":        "Question",
    name:           f.p,
    acceptedAnswer: { "@type": "Answer", text: f.r },
  })),
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(faqJsonLd) }}
      />
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
