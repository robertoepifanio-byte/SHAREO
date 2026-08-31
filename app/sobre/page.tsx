import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { AppHeader } from "@/components/layout/AppHeader"
import { prisma } from "@/lib/prisma"

export const revalidate = 60

export const metadata: Metadata = {
  title: "Sobre o ShareO",
  description:
    "Conheça a missão, história e valores do ShareO — marketplace de economia circular para aluguel local de itens em todo o Brasil.",
}

const VALORES = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z"/>
        <path d="M12 6v6l4 2"/>
      </svg>
    ),
    title: "Sustentabilidade",
    description: "Reduzir consumo excessivo e prolongar a vida útil dos itens.",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    title: "Comunidade",
    description: "Fortalecer laços locais e incentivar a colaboração entre vizinhos.",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
    ),
    title: "Segurança",
    description: "Garantir transações protegidas e usuários verificados.",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 8v4l3 3"/>
      </svg>
    ),
    title: "Acessibilidade",
    description: "Tornar o aluguel de itens simples e vantajoso para todos.",
  },
]

// "itens cadastrados" era fixo ("2.400+") enquanto Início (app/page.tsx:115)
// já mostra a contagem real via prisma.item.count — corrigido 2026-07-06 pra
// não divergir do número real da plataforma.
const STATS_STATIC = [
  // "renda média/mês por proprietário" (R$2.000) removido — número fabricado sem
  // dado real (risco CDC art. 30/37). Reintroduzir só com média real de repasses.
  // Revisão s41 (decisão do fundador).
  { value: "2026", label: "ano de fundação" },
]

const EQUIPE = [
  {
    title: "Fundadores",
    description:
      "Um grupo de empreendedores apaixonados por tecnologia e impacto social, que acreditam no poder da colaboração comunitária.",
  },
  {
    title: "Equipe de Produto",
    description:
      "Responsável por garantir uma experiência fluida e segura, com funcionalidades como chat integrado, verificação de usuários e pagamentos protegidos.",
  },
  {
    title: "Suporte seg–sex, 09h–17h",
    description:
      "Profissionais dedicados a ajudar usuários em todas as etapas, reforçando a confiança na plataforma.",
  },
  {
    title: "Rede de Proprietários Fundadores",
    description:
      "Os primeiros cadastrados, que recebem benefícios exclusivos e ajudam a moldar o futuro do ShareO.",
  },
]

export default async function SobrePage() {
  const itemCount = await prisma.item.count({ where: { deletedAt: null } }).catch(() => 0)

  const STATS = [
    { value: itemCount.toLocaleString("pt-BR"), label: "itens cadastrados" },
    ...STATS_STATIC,
  ]

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main>
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="bg-primary py-20 text-white">
          <div className="container text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-accent">
              Sobre o ShareO
            </p>
            <h1 className="font-display text-4xl font-bold leading-tight md:text-5xl">
              Use Mais. Possua Menos.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
              O ShareO conecta pessoas que querem gerar renda alugando seus bens
              para quem precisa usar sem comprar. Uma forma inteligente de transformar
              patrimônio parado em renda, reduzir desperdícios e facilitar o acesso a
              tudo o que você precisa.
            </p>
          </div>
        </section>

        {/* ── Stats ────────────────────────────────────────────────────── */}
        <section className="border-b border-border bg-surface">
          <div className="container py-12">
            <dl className="grid grid-cols-2 gap-8 md:grid-cols-3">
              {STATS.map((s) => (
                <div key={s.label} className="text-center">
                  <dt className="font-display text-3xl font-bold text-brand">{s.value}</dt>
                  <dd className="mt-1 text-sm text-muted-foreground">{s.label}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ── Missão ───────────────────────────────────────────────────── */}
        <section className="container py-16">
          <div className="mx-auto max-w-3xl">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-2xl" aria-hidden="true">🌱</span>
              <h2 className="font-display text-2xl font-bold text-primary">Missão</h2>
            </div>
            <p className="mb-4 text-lg font-semibold text-foreground">
              &ldquo;Transformar o que está parado em oportunidade de renda.&rdquo;
            </p>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                O ShareO nasceu para ajudar pessoas a monetizar bens que já possuem, criando uma
                nova fonte de renda de forma simples, acessível e segura.
              </p>
              <p>
                Nossa missão é conectar quem tem itens sem uso com quem precisa utilizá-los por um
                período, tornando o aluguel uma alternativa inteligente ao consumo tradicional.
              </p>
              <p>
                Mais do que uma plataforma de locação, queremos criar um ecossistema onde qualquer
                pessoa possa gerar renda extra com seu próprio patrimônio, enquanto outras economizam
                ao acessar o que precisam sem precisar comprar.
              </p>
              <p>
                Ao incentivar o uso compartilhado de bens, fortalecemos comunidades locais, reduzimos
                desperdícios e promovemos um modelo de consumo mais eficiente, sustentável e
                colaborativo.
              </p>
            </div>
          </div>
        </section>

        {/* ── História ─────────────────────────────────────────────────── */}
        <section className="bg-surface py-16">
          <div className="container">
            <div className="mx-auto max-w-3xl">
              <div className="mb-3 flex items-center gap-2">
                <span className="text-2xl" aria-hidden="true">📖</span>
                <h2 className="font-display text-2xl font-bold text-primary">História</h2>
              </div>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  O ShareO surgiu em 2026 a partir de uma constatação simples: milhões de pessoas
                  possuem itens de valor parados em casa — ferramentas, equipamentos, eletrônicos,
                  artigos para festas, esportes e muito mais — sem perceber que esses bens podem
                  gerar renda.
                </p>
                <p>
                  Percebemos também que muitas pessoas precisam desses mesmos itens por poucas horas
                  ou poucos dias, mas acabam gastando alto para comprar algo que usarão raramente.
                </p>
                <p>
                  Foi dessa oportunidade que nasceu o ShareO: uma plataforma criada para conectar
                  proprietários e locatários de forma prática, segura e transparente, permitindo que
                  bens parados se transformem em renda e necessidade em economia.
                </p>
                <p>
                  Porque acreditamos que, no futuro, gerar renda com o que você já tem será tão
                  comum quanto vender ou comprar online.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Valores ──────────────────────────────────────────────────── */}
        <section className="container py-16">
          <div className="mx-auto max-w-4xl">
            <div className="mb-10 text-center">
              <div className="mb-3 flex items-center justify-center gap-2">
                <span className="text-2xl" aria-hidden="true">✨</span>
                <h2 className="font-display text-2xl font-bold text-primary">Valores</h2>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {VALORES.map((v) => (
                <div
                  key={v.title}
                  className="flex items-start gap-4 rounded-xl border border-border bg-surface p-6"
                >
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                    {v.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{v.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{v.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Equipe ───────────────────────────────────────────────────── */}
        <section className="bg-surface py-16">
          <div className="container">
            <div className="mx-auto max-w-4xl">
              <div className="mb-10 text-center">
                <div className="mb-3 flex items-center justify-center gap-2">
                  <span className="text-2xl" aria-hidden="true">👥</span>
                  <h2 className="font-display text-2xl font-bold text-primary">Equipe</h2>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {EQUIPE.map((e) => (
                  <div key={e.title} className="rounded-xl border border-border bg-background p-6">
                    <h3 className="mb-2 font-semibold text-foreground">{e.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{e.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Desenvolvimento ──────────────────────────────────────────── */}
        <section className="container py-16">
          <div className="mx-auto max-w-4xl">
            <div className="mb-10 text-center">
              <div className="mb-3 flex items-center justify-center gap-2">
                <span className="text-2xl" aria-hidden="true">💻</span>
                <h2 className="font-display text-2xl font-bold text-primary">Desenvolvimento</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                O ShareO foi concebido e desenvolvido com parceria técnica especializada.
              </p>
            </div>
            <div className="flex justify-center">
              <div className="flex flex-col items-center gap-5 rounded-2xl border border-border bg-surface p-8 text-center">
                <Image
                  src="/logos/pratika-ia-sobre.png"
                  alt="Pratika-IA"
                  width={709}
                  height={303}
                  className="h-auto w-full max-w-sm"
                />
                <p className="max-w-sm text-sm text-muted-foreground leading-relaxed">
                  Responsável pelo desenvolvimento completo da plataforma ShareO — da arquitetura
                  ao produto final, com foco em experiência do usuário, segurança e escalabilidade.
                </p>
                <a
                  href="https://www.pratika.ia.br"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold text-brand hover:underline"
                >
                  www.pratika.ia.br
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────────────── */}
        <section className="container py-20">
          <div className="mx-auto max-w-2xl rounded-2xl bg-primary px-8 py-14 text-center text-white">
            <h2 className="font-display text-2xl font-bold md:text-3xl">
              Faça parte da comunidade ShareO
            </h2>
            <p className="mt-4 text-white/80">
              Cadastre seu item hoje e comece a transformar o que está parado em renda.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/itens/novo"
                className="inline-flex h-11 items-center rounded-lg bg-brand px-6 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
              >
                Cadastrar meu item
              </Link>
              <Link
                href="/itens"
                className="inline-flex h-11 items-center rounded-lg border border-white/30 px-6 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
              >
                Explorar anúncios
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
