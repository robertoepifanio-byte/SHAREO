import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { AppHeader } from "@/components/layout/AppHeader"
import { ItemCard } from "@/components/items/ItemCard"

export const metadata: Metadata = {
  title: "ShareO — Use Mais. Possua Menos.",
  description: "Alugue o que precisa de quem já tem. Marketplace de economia circular em Natal/RN.",
}

export const revalidate = 3600

const CATEGORY_IMAGES: Record<string, string> = {
  Ferramentas: "/icones/ferramentas.png",
  Construção:  "/icones/construcao.png",
  Moda:        "/icones/moda.png",
  Eletrônicos: "/icones/eletronicos.png",
  Casa:        "/icones/casa.png",
  Esporte:     "/icones/esporte.png",
  Jardim:      "/icones/jardim.png",
  Festas:      "/icones/festas.png",
}

export default async function HomePage() {
  const [categories, items] = await Promise.all([
    prisma.category.findMany({
      where:   { parentId: null },
      select:  { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.item.findMany({
      where:   { isActive: true, isApproved: true, deletedAt: null },
      take:    8,
      orderBy: { viewCount: "desc" },
      select: {
        id: true, title: true, pricePerDay: true, condition: true,
        city: true, state: true, neighborhood: true, isActive: true,
        category: { select: { name: true } },
        owner:    { select: { name: true, isVerified: true } },
        images:   { select: { url: true }, orderBy: { order: "asc" }, take: 1 },
        _count:   { select: { reviews: true, favorites: true } },
      },
    }),
  ])

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      {/* ─── HERO ─── */}
      <section
        className="bg-gradient-to-br from-primary to-[#1a3a5c] px-4 py-12 text-center md:py-20"
        aria-label="Seção principal"
      >
        <div
          className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/15 px-3 py-1 text-xs font-semibold text-success"
          aria-hidden="true"
        >
          🌿 Economia Circular
        </div>
        <h1 className="mb-3 text-4xl font-extrabold leading-tight text-white md:text-6xl">
          Use Mais.<br />Possua Menos.
        </h1>
        <p className="mx-auto mb-8 max-w-lg text-base text-white/75">
          Alugue o que precisa de quem já tem. Próximo de você, rápido e seguro.
        </p>

        {/* Search box */}
        <form
          action="/itens"
          method="GET"
          className="mx-auto flex max-w-xl overflow-hidden rounded-xl bg-white shadow-2xl"
          role="search"
        >
          <label htmlFor="hero-search" className="sr-only">Buscar item para alugar</label>
          <input
            id="hero-search"
            name="search"
            type="text"
            placeholder="O que você precisa alugar?"
            className="flex-1 border-none px-5 py-4 text-base text-foreground outline-none placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            className="bg-brand px-6 text-sm font-semibold text-white hover:opacity-90 transition-opacity whitespace-nowrap"
          >
            Buscar 🔍
          </button>
        </form>

        {/* Stats */}
        <div className="mt-8 flex flex-wrap justify-center gap-6" aria-label="Estatísticas da plataforma">
          <div className="text-center">
            <strong className="block text-2xl font-extrabold text-white">12.400+</strong>
            <span className="text-xs text-white/80">Itens disponíveis</span>
          </div>
          <div className="text-center">
            <strong className="block text-2xl font-extrabold text-white">3.800+</strong>
            <span className="text-xs text-white/80">Proprietários</span>
          </div>
          <div className="text-center">
            <strong className="block text-2xl font-extrabold text-white">4,9 ★</strong>
            <span className="text-xs text-white/80">Avaliação média</span>
          </div>
        </div>
      </section>

      <div className="container">

        {/* ─── CATEGORIAS ─── */}
        {categories.length > 0 && (
          <section className="py-8" aria-labelledby="cats-title">
            <h2 className="mb-5 text-xl font-bold text-primary md:text-2xl" id="cats-title">
              Explorar por categoria
            </h2>
            <div className="relative">
              {/* fade lateral para indicar scroll */}
              <div className="pointer-events-none absolute right-0 top-0 bottom-1 w-12 bg-gradient-to-r from-transparent to-background z-10" aria-hidden="true" />
              <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1" role="list" aria-label="Categorias de itens">
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/itens?categoryId=${cat.id}`}
                    role="listitem"
                    className="flex min-w-[88px] flex-shrink-0 flex-col items-center gap-2 rounded-lg border-2 border-border bg-surface px-4 py-3.5 text-xs font-semibold text-primary transition-colors hover:border-brand hover:shadow-sm"
                    aria-label={cat.name}
                  >
                    {CATEGORY_IMAGES[cat.name] ? (
                      <Image
                        src={CATEGORY_IMAGES[cat.name]}
                        alt=""
                        width={72}
                        height={72}
                        className="object-contain"
                        aria-hidden="true"
                      />
                    ) : (
                      <span className="text-3xl leading-none" aria-hidden="true">📦</span>
                    )}
                    <span>{cat.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ─── MAPA ─── */}
        <section className="pb-8" aria-label="Mapa de itens próximos">
          <div
            className="relative flex h-48 w-full items-center justify-center overflow-hidden rounded-lg border border-border bg-gradient-to-br from-[#ccd9e5] to-[#a8c0d4]"
            role="img"
            aria-label="Mapa com itens disponíveis em Natal, RN"
          >
            <span className="text-5xl" aria-hidden="true">🗺️</span>
            <div className="absolute bottom-3 right-3 rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-primary shadow-sm" aria-hidden="true">
              Ver no mapa
            </div>
          </div>
        </section>

        {/* ─── ITENS PRÓXIMOS ─── */}
        {items.length > 0 && (
          <section className="pb-8" aria-labelledby="nearby-title">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-primary md:text-2xl" id="nearby-title">
                Próximos de você
              </h2>
              <Link
                href="/itens"
                className="text-sm font-semibold text-brand hover:underline outline-none focus-visible:ring-1 focus-visible:ring-brand rounded"
              >
                Ver todos →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-4">
              {items.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        )}

        {/* ─── COMO FUNCIONA ─── */}
        <section className="py-8" aria-labelledby="how-title">
          <h2 className="mb-5 text-xl font-bold text-primary md:text-2xl" id="how-title">
            Como funciona
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              {
                num: "1",
                title: "Busque o que precisa",
                desc: "Pesquise por categoria, localização ou nome. Veja itens disponíveis perto de você no mapa.",
              },
              {
                num: "2",
                title: "Combine com o proprietário",
                desc: "Envie mensagem pelo chat do ShareO, combine as datas e a retirada do item com segurança.",
              },
              {
                num: "3",
                title: "Use e devolva",
                desc: "Retire, use pelo período combinado e devolva. Avalie a experiência e construa sua reputação.",
              },
            ].map((step) => (
              <div key={step.num} className="rounded-lg border border-border bg-surface p-6 text-center">
                <div
                  className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-brand text-lg font-extrabold text-white"
                  aria-hidden="true"
                >
                  {step.num}
                </div>
                <h3 className="mb-2 text-base font-bold text-primary">{step.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── CTA ─── */}
        <section className="pb-12">
          <div className="rounded-xl bg-gradient-to-br from-primary to-[#1a3a5c] px-8 py-10">
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/15 px-3 py-1 text-xs font-semibold text-success">
              🌿 Economia circular
            </div>
            <h2 className="mb-3 text-2xl font-extrabold leading-snug text-white">
              Tem itens parados?<br />Transforme em renda.
            </h2>
            <p className="mb-6 max-w-lg text-sm text-white/75 leading-relaxed">
              Cadastre seus itens gratuitamente e comece a alugar para pessoas próximas. Sem mensalidade, sem complicação.
            </p>
            <Link
              href="/itens/novo"
              className="inline-flex h-12 items-center rounded-lg bg-brand px-6 text-base font-semibold text-white hover:opacity-90 transition-opacity outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
            >
              Começar a anunciar →
            </Link>
          </div>
        </section>

      </div>
    </div>
  )
}
