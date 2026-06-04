import type { Metadata } from "next"
import Link from "next/link"
import { AppHeader } from "@/components/layout/AppHeader"

export const metadata: Metadata = {
  title: "Comunidade — ShareO",
  description: "Faça parte da comunidade ShareO — conexão local, benefícios e participação.",
}

const SECTIONS = [
  {
    icon: "🤝",
    title: "Conexão Local",
    items: [
      "O ShareO fortalece laços entre vizinhos e promove uma rede colaborativa.",
      "Incentivamos o compartilhamento de experiências e dicas de uso dos itens.",
    ],
  },
  {
    icon: "🎁",
    title: "Benefícios",
    items: [
      "Proprietários fundadores recebem vantagens exclusivas.",
      "Locatários têm acesso a uma variedade crescente de itens sem precisar comprar.",
    ],
  },
  {
    icon: "🗣️",
    title: "Participação",
    items: [
      "Fóruns e grupos de discussão para trocar ideias.",
      "Eventos e campanhas de consumo consciente e sustentabilidade.",
      "Espaço para feedback e sugestões de melhorias na plataforma.",
    ],
  },
]

export default function ComunidadePage() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <div className="border-b border-border bg-surface">
        <div className="container py-3">
          <nav aria-label="Breadcrumb">
            <ol className="flex items-center gap-1 text-xs text-muted-foreground">
              <li><Link href="/" className="hover:text-foreground transition-colors">Início</Link></li>
              <li aria-hidden="true">›</li>
              <li className="text-foreground font-medium">Comunidade</li>
            </ol>
          </nav>
        </div>
      </div>

      <main className="container py-12">
        <div className="mx-auto max-w-3xl">
          <div className="mb-10">
            <h1 className="font-display text-3xl font-bold text-primary">🤝 Comunidade ShareO</h1>
            <p className="mt-3 text-muted-foreground">
              Mais do que uma plataforma — uma rede de pessoas que acreditam no poder do compartilhamento.
            </p>
          </div>

          <div className="space-y-8">
            {SECTIONS.map((s) => (
              <section key={s.title} className="rounded-xl border border-border bg-surface p-6">
                <div className="mb-4 flex items-center gap-2">
                  <span className="text-xl" aria-hidden="true">{s.icon}</span>
                  <h2 className="font-display text-xl font-bold text-primary">{s.title}</h2>
                </div>
                <ul className="space-y-3">
                  {s.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground leading-relaxed">
                      <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <div className="mt-10 rounded-xl bg-primary px-8 py-10 text-center text-white">
            <h2 className="font-display text-xl font-bold">Faça parte da comunidade</h2>
            <p className="mt-2 text-sm text-white/80">
              Cadastre-se e junte-se a milhares de pessoas que já compartilham e alugam itens no ShareO.
            </p>
            <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/cadastro"
                className="inline-flex h-11 items-center rounded-lg bg-[#007B3C] px-6 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
              >
                Criar conta grátis
              </Link>
              <Link
                href="/itens"
                className="inline-flex h-11 items-center rounded-lg border border-white/30 px-6 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
              >
                Explorar itens
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
