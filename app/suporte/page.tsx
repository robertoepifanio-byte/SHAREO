import type { Metadata } from "next"
import Link from "next/link"
import { AppHeader } from "@/components/layout/AppHeader"

export const metadata: Metadata = {
  title: "Suporte — ShareO",
  description: "Central de ajuda, atendimento e segurança do ShareO.",
}

const SECTIONS = [
  {
    icon: "❓",
    title: "Central de Ajuda",
    items: [
      { label: "FAQ", description: "Respostas rápidas para dúvidas comuns." },
      { label: "Tutoriais", description: "Passo a passo para cadastrar, alugar e gerenciar itens." },
    ],
  },
  {
    icon: "💬",
    title: "Atendimento",
    items: [
      { label: "Chat integrado", description: "Suporte direto dentro da plataforma." },
      { label: "E-mail", description: "Contato para questões específicas." },
      { label: "Disponibilidade", description: "Equipe ativa 7 dias por semana para resolver problemas." },
    ],
  },
  {
    icon: "🛡️",
    title: "Segurança",
    items: [
      { label: "Reputação", description: "Sistema de avaliação e reputação para aumentar a confiança entre usuários." },
      { label: "Disputas", description: "Canal exclusivo para reportar incidentes ou disputas." },
    ],
  },
]

export default function SuportePage() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <div className="border-b border-border bg-surface">
        <div className="container py-3">
          <nav aria-label="Breadcrumb">
            <ol className="flex items-center gap-1 text-xs text-muted-foreground">
              <li><Link href="/" className="hover:text-foreground transition-colors">Início</Link></li>
              <li aria-hidden="true">›</li>
              <li className="text-foreground font-medium">Suporte</li>
            </ol>
          </nav>
        </div>
      </div>

      <main className="container py-12">
        <div className="mx-auto max-w-3xl">
          <div className="mb-10">
            <h1 className="font-display text-3xl font-bold text-primary">🛠️ Suporte ShareO</h1>
            <p className="mt-3 text-muted-foreground">
              Estamos aqui para ajudar. Encontre respostas, tutoriais e canais de atendimento.
            </p>
          </div>

          <div className="space-y-8">
            {SECTIONS.map((s) => (
              <section key={s.title} className="rounded-xl border border-border bg-surface p-6">
                <div className="mb-4 flex items-center gap-2">
                  <span className="text-xl" aria-hidden="true">{s.icon}</span>
                  <h2 className="font-display text-xl font-bold text-primary">{s.title}</h2>
                </div>
                <div className="space-y-3">
                  {s.items.map((item) => (
                    <div key={item.label} className="flex items-start gap-3">
                      <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand" aria-hidden="true" />
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        <span className="font-semibold text-foreground">{item.label}:</span>{" "}
                        {item.description}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/ajuda"
              className="flex-1 rounded-xl border border-border bg-surface px-5 py-4 text-center text-sm font-semibold text-foreground hover:border-brand hover:text-brand transition-colors"
            >
              Acessar Central de Ajuda →
            </Link>
            <Link
              href="/mensagens"
              className="flex-1 rounded-xl bg-brand px-5 py-4 text-center text-sm font-semibold text-white hover:opacity-90 transition-opacity"
            >
              Abrir Chat de Suporte →
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
