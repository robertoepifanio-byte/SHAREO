import type { Metadata } from "next"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { AppHeader } from "@/components/layout/AppHeader"
import { CategoryIcon } from "@/components/ui/CategoryIcon"
import { SimuladorRenda } from "@/components/home/SimuladorRenda"
import { ItensProcurados } from "@/components/home/ItensProcurados"
import { CasosRenda } from "@/components/home/CasosRenda"
import { Seguranca } from "@/components/home/Seguranca"
import { ListaVIP } from "@/components/home/ListaVIP"
import { HeroSearch } from "@/components/home/HeroSearch"

export const metadata: Metadata = {
  title: "ShareO — Use Mais. Possua Menos.",
  description: "Alugue o que precisa de quem já tem. Marketplace de economia circular em Natal/RN.",
}

export const revalidate = 60

const steps = [
  {
    num: "1",
    title: "Busque o que precisa",
    desc: "Pesquise por categoria, localização ou nome. Veja itens disponíveis perto de você no mapa.",
    icon: (
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#007B3C"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
    ),
  },
  {
    num: "2",
    title: "Combine com o proprietário",
    desc: "Envie mensagem pelo chat do ShareO, combine as datas e a retirada do item com segurança.",
    icon: (
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#144D81"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    num: "3",
    title: "Use e devolva",
    desc: "Retire, use pelo período combinado e devolva. Avalie a experiência e construa sua reputação.",
    icon: (
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#007B3C"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 12h14" />
        <path d="m12 5 7 7-7 7" />
      </svg>
    ),
  },
]

export default async function HomePage() {
  const session = await auth().catch(() => null)

  const cityName = session?.user?.id
    ? await prisma.user
        .findUnique({ where: { id: session.user.id }, select: { city: true } })
        .then((u) => u?.city ?? "Natal")
        .catch(() => "Natal")
    : "Natal"

  const [categories, cityItemCount] = await Promise.all([
    prisma.category
      .findMany({
        where: { parentId: null },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })
      .catch(() => []),

    prisma.item
      .count({
        where: { status: "AVAILABLE", isApproved: true, deletedAt: null, city: cityName },
      })
      .catch(() => 0),
  ])

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main>
        {/* ─── HERO ─── */}
        <section
          className="relative overflow-hidden bg-gradient-to-br from-primary to-[#144D81] px-4 py-10 md:px-8 md:py-16 xl:px-16"
          aria-label="Seção principal"
        >
          {/* orbe decorativo */}
          <div
            className="pointer-events-none absolute -right-24 -top-24 h-[300px] w-[300px] rounded-full bg-brand/15 xl:h-[500px] xl:w-[500px]"
            aria-hidden="true"
          />

          <div className="relative z-10 mx-auto max-w-[640px] text-center">
            {/* Badge dourado */}
            <div
              role="note"
              aria-label="Proposta de valor"
              className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-[rgba(255,215,0,0.35)] bg-[rgba(255,215,0,0.15)] px-3.5 py-1.5 text-xs font-semibold text-gold"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v2m0 8v2M9.5 9.5a2.5 2.5 0 0 1 5 0c0 1.5-2.5 3-2.5 3m0 0v.5" />
              </svg>
              Transforme itens parados em renda
            </div>

            {/* H1 */}
            <h1 className="mb-4 font-display text-[24px] font-extrabold leading-[1.15] text-white xl:text-5xl">
              Ganhe dinheiro com o que
              <br />
              <span className="text-accent">está parado na sua casa.</span>
            </h1>

            {/* Subtítulo */}
            <p className="mb-8 text-base leading-relaxed text-white/75 md:text-[17px]">
              Ferramentas, eletrônicos, itens para festas, esportes, casa e cozinha.
              <br />
              Tudo perto de você.
            </p>

            {/* Dual CTA */}
            <div
              role="group"
              aria-label="Ações principais"
              className="mb-5 flex flex-col items-stretch gap-3 md:flex-row md:flex-wrap md:items-center md:justify-center"
            >
              <Link
                href="/itens/novo"
                className="inline-flex min-h-tap w-full items-center justify-center gap-2 rounded-lg bg-brand px-6 py-3 text-sm font-semibold uppercase tracking-[0.4px] text-white transition-colors hover:bg-brand-hover md:w-auto md:min-w-[220px]"
                aria-label="Quero ganhar dinheiro anunciando meus itens"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v2m0 8v2M9.5 9.5a2.5 2.5 0 0 1 5 0c0 1.5-2.5 3-2.5 3" />
                </svg>
                Quero Ganhar Dinheiro
              </Link>
              <Link
                href="/itens"
                className="inline-flex min-h-tap w-full items-center justify-center gap-2 rounded-lg border-2 border-white/60 bg-transparent px-6 py-3 text-sm font-semibold uppercase tracking-[0.4px] text-white transition-all hover:border-white hover:bg-white/10 md:w-auto md:min-w-[200px]"
                aria-label="Quero alugar um item"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                Quero Alugar
              </Link>
            </div>

            {/* Campo de busca */}
            <HeroSearch />

            {/* Tagline */}
            <p className="mt-3 text-xs italic tracking-[0.3px] text-white/85">
              <em>Use Mais. Possua Menos.</em>
            </p>

            {/* Stats integradas (substituem proof bar separado) */}
            <div
              role="list"
              aria-label="Números da plataforma"
              className="mt-9 flex flex-wrap justify-center gap-5 xl:gap-8"
            >
              {[
                { num: "2.400+", label: "Itens disponíveis" },
                { num: "R$2.000", label: "Renda média/mês" },
                { num: "4,8 ★", label: "Avaliação média" },
                {
                  num: cityItemCount > 0 ? `${cityItemCount}` : "890+",
                  label: cityItemCount > 0 ? `Itens em ${cityName}` : "Proprietários ativos",
                },
              ].map((stat) => (
                <div key={stat.label} role="listitem" className="text-center text-white">
                  <div className="text-[22px] font-extrabold leading-none text-accent xl:text-[28px]">
                    {stat.num}
                  </div>
                  <div className="mt-0.5 text-[12px] text-white/60">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── SIMULADOR DE RENDA ─── */}
        <div id="simulador"><SimuladorRenda /></div>

        {/* ─── CATEGORIAS ─── */}
        {categories.length > 0 && (
          <section id="categorias" className="container py-8" aria-labelledby="cats-title">
            <h2 className="mb-5 text-xl font-bold text-primary md:text-2xl" id="cats-title">
              Explorar por categoria
            </h2>
            <div className="relative">
              {/* fade lateral para indicar scroll */}
              <div
                className="pointer-events-none absolute bottom-1 right-0 top-0 z-10 w-12 bg-gradient-to-r from-transparent to-background"
                aria-hidden="true"
              />
              <div
                className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                role="list"
                aria-label="Categorias de itens"
              >
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/itens?categoryId=${cat.id}`}
                    role="listitem"
                    className="flex min-w-[110px] flex-shrink-0 flex-col items-center gap-2 rounded-lg border-2 border-border bg-surface px-3 py-3 text-xs font-semibold text-primary transition-colors hover:border-brand hover:shadow-sm"
                    aria-label={cat.name}
                  >
                    <CategoryIcon name={cat.name} size={96} />
                    <span>{cat.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ─── COMO FUNCIONA ─── */}
        <section id="como-funciona" className="container py-8" aria-labelledby="how-title">
          <h2
            className="mb-5 font-display text-xl font-bold text-primary md:text-2xl"
            id="how-title"
          >
            Como funciona
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {steps.map((step) => (
              <div
                key={step.num}
                className="rounded-lg border border-border bg-surface p-6 text-center"
              >
                {/* step-icon — SVG específico por step */}
                <div className="mb-3 flex items-center justify-center" aria-hidden="true">
                  {step.icon}
                </div>
                <div
                  className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-brand text-lg font-extrabold text-white"
                  aria-hidden="true"
                >
                  {step.num}
                </div>
                <h3 className="mb-2 font-display text-base font-bold text-primary">
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── QUEM JÁ ESTÁ GANHANDO ─── */}
        <div id="casos-renda"><CasosRenda /></div>

        {/* ─── ITENS MAIS PROCURADOS ─── */}
        <div id="itens-procurados"><ItensProcurados /></div>

        {/* ─── SEGURANÇA ─── */}
        <div id="seguranca"><Seguranca /></div>

        {/* ─── LISTA VIP ─── */}
        <ListaVIP />
      </main>
    </div>
  )
}
