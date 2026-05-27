import Link from "next/link"

type Feature = "analytics" | "import" | "generic"

interface PjGateProps {
  feature?: Feature
}

const COPY: Record<Feature, { title: string; description: string }> = {
  analytics: {
    title: "Analytics exclusivo para contas PJ",
    description:
      "Acompanhe visualizações, reservas e receita de cada anúncio em tempo real. Disponível para Pessoas Jurídicas.",
  },
  import: {
    title: "Importação em massa para contas PJ",
    description:
      "Cadastre até 100 itens de uma vez com um arquivo CSV — ideal para negócios com grande estoque.",
  },
  generic: {
    title: "Recurso exclusivo para contas PJ",
    description:
      "Este recurso está disponível apenas para contas de Pessoa Jurídica verificadas.",
  },
}

const BENEFITS = [
  {
    title: "Analytics avançado",
    description: "Views, reservas e receita por anúncio",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <line x1="18" y1="20" x2="18" y2="10"/>
        <line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6"  y1="20" x2="6"  y2="14"/>
      </svg>
    ),
  },
  {
    title: "Vitrine personalizada",
    description: "Página de loja pública com sua marca",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    title: "Importação CSV",
    description: "Cadastre até 100 itens de uma vez",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/>
        <line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
    ),
  },
]

export function PjGate({ feature = "generic" }: PjGateProps) {
  const { title, description } = COPY[feature]

  return (
    <div className="mx-auto max-w-2xl py-12 text-center">
      {/* Lock icon */}
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-brand/10">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-brand"
          aria-hidden="true"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      </div>

      <span className="mb-3 inline-flex items-center rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
        Exclusivo PJ
      </span>

      <h2 className="mt-3 text-xl font-bold text-primary">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>

      {/* Benefits grid */}
      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {BENEFITS.map((b) => (
          <div
            key={b.title}
            className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface p-5"
          >
            <span className="text-brand">{b.icon}</span>
            <p className="font-semibold text-foreground text-sm">{b.title}</p>
            <p className="text-xs text-muted-foreground">{b.description}</p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="mt-8 space-y-3">
        <Link
          href="/perfil"
          className="inline-flex h-11 items-center rounded-lg bg-brand px-8 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
        >
          Fazer upgrade para conta PJ
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ml-1.5" aria-hidden="true">
            <line x1="5" y1="12" x2="19" y2="12"/>
            <polyline points="12 5 19 12 12 19"/>
          </svg>
        </Link>
        <p className="text-xs text-muted-foreground">
          Vá em <strong className="text-foreground">Perfil → Conta</strong> e informe seu CNPJ para ativar gratuitamente.
        </p>
      </div>
    </div>
  )
}
