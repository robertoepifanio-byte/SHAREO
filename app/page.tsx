import type { Metadata } from "next"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { AppHeader } from "@/components/layout/AppHeader"
import { ItemCard } from "@/components/items/ItemCard"
import { CategoryIcon } from "@/components/ui/CategoryIcon"
import type { ItemPin } from "@/components/items/ItemsMap"
import { getUserMapLocation } from "@/lib/userLocation"
import { HomeMapPanel } from "@/components/home/HomeMapPanel"

export const metadata: Metadata = {
  title: "ShareO — Use Mais. Possua Menos.",
  description: "Alugue o que precisa de quem já tem. Marketplace de economia circular em Natal/RN.",
}

export const revalidate = 60


export default async function HomePage() {
  const session = await auth().catch(() => null)
  const [userLoc, userCity] = await Promise.all([
    getUserMapLocation(session?.user?.id),
    session?.user?.id
      ? prisma.user.findUnique({ where: { id: session.user.id }, select: { city: true, state: true } })
          .then((u) => u?.city ? `${u.city}${u.state ? `, ${u.state}` : ""}` : "Natal, RN")
          .catch(() => "Natal, RN")
      : Promise.resolve("Natal, RN"),
  ])

  const itemSelect = {
    id: true, title: true, pricePerDay: true, condition: true,
    city: true, state: true, neighborhood: true, isActive: true,
    latitude: true, longitude: true,
    category: { select: { name: true } },
    owner:    { select: { name: true, isVerified: true } },
    images:   { select: { url: true }, orderBy: { order: "asc" }, take: 1 },
    _count:   { select: { reviews: true, favorites: true, bookings: true } },
  } as const

  const cityName = userCity.split(",")[0].trim()

  const [categories, items, hotItems, cityItemCount] = await Promise.all([
    prisma.category.findMany({
      where:   { parentId: null },
      select:  { id: true, name: true },
      orderBy: { name: "asc" },
    }).catch(() => []),

    // Mais recentes — seção "Próximos de você"
    prisma.item.findMany({
      where:   { isActive: true, isApproved: true, deletedAt: null },
      take:    8,
      orderBy: { viewCount: "desc" },
      select:  itemSelect,
    }).then((rows) => rows.filter((r) => r.category && r.owner)).catch(() => []),

    // Mais alugados — seção "🔥 Mais alugados esta semana"
    prisma.item.findMany({
      where:   { isActive: true, isApproved: true, deletedAt: null },
      take:    4,
      orderBy: { createdAt: "desc" }, // fallback; será ordenado por bookings quando suportado
      select:  itemSelect,
    }).then((rows) => rows.filter((r) => r.category && r.owner)).catch(() => []),

    // P3-78: contagem de itens disponíveis na cidade do usuário
    prisma.item.count({
      where: { isActive: true, isApproved: true, deletedAt: null, city: cityName },
    }).catch(() => 0),
  ])

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main>
      {/* ─── HERO ─── */}
      <section
        className="bg-gradient-to-br from-primary to-[#144D81] px-4 py-12 text-center md:py-20"
        aria-label="Seção principal"
      >
        <div
          className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/15 px-3 py-1 text-xs font-semibold text-accent"
          aria-hidden="true"
        >
          🌿 Economia Circular
          {cityItemCount > 0 && (
            <span className="ml-1 text-white/80">
              · {cityItemCount} iten{cityItemCount !== 1 ? "s" : ""} em {cityName}
            </span>
          )}
        </div>
        <h1 className="mb-3 font-display text-4xl font-extrabold leading-tight text-white md:text-6xl">
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

        {/* Trust seals */}
        <div className="mt-8 flex flex-wrap justify-center gap-6" aria-label="Garantias da plataforma">
          <div className="flex items-center gap-2 text-white/80 text-sm">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-base flex-shrink-0">🔒</span>
            <div className="text-left">
              <strong className="block text-white text-xs font-semibold">Pagamento seguro</strong>
              <span className="text-white/60 text-xs">Liberado só após confirmação</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-white/80 text-sm">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-base flex-shrink-0">✓</span>
            <div className="text-left">
              <strong className="block text-white text-xs font-semibold">Usuários verificados</strong>
              <span className="text-white/60 text-xs">Identidade validada</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-white/80 text-sm">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-base flex-shrink-0">💬</span>
            <div className="text-left">
              <strong className="block text-white text-xs font-semibold">Suporte 7 dias</strong>
              <span className="text-white/60 text-xs">Estamos aqui pra você</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── PROOF BAR ─── */}
      <section className="bg-primary py-6" aria-label="Números da plataforma">
        <div className="container flex flex-wrap justify-center gap-8 md:gap-16">
          <div className="text-center">
            <strong className="block text-2xl font-extrabold text-accent">2.400+</strong>
            <span className="text-xs text-white/60">Itens disponíveis</span>
          </div>
          <div className="text-center">
            <strong className="block text-2xl font-extrabold text-accent">890+</strong>
            <span className="text-xs text-white/60">Usuários ativos</span>
          </div>
          <div className="text-center">
            <strong className="block text-2xl font-extrabold text-accent">4,8 ★</strong>
            <span className="text-xs text-white/60">Avaliação média</span>
          </div>
          <div className="text-center">
            <strong className="block text-2xl font-extrabold text-accent">759 kg</strong>
            <span className="text-xs text-white/60">CO₂ economizados</span>
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

        {/* ─── MAPA + FILTRO DISTÂNCIA ─── */}
        <section className="pb-8" aria-label="Mapa de itens próximos">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-bold text-primary md:text-2xl">📍 Itens próximos de você</h2>
            <Link href="/itens" className="text-sm font-semibold text-brand hover:underline">Ver todos →</Link>
          </div>
          <HomeMapPanel
            defaultLat={userLoc.lat}
            defaultLng={userLoc.lng}
            defaultZoom={userLoc.zoom}
            userCity={userCity}
            items={items
              .filter((i) => i.latitude != null && i.longitude != null)
              .map<ItemPin>((i) => ({
                id:          i.id,
                title:       i.title,
                pricePerDay: i.pricePerDay,
                lat:         i.latitude as number,
                lng:         i.longitude as number,
              }))}
          />
        </section>

        {/* ─── 🔥 MAIS ALUGADOS ─── */}
        {hotItems.length > 0 && (
          <section className="pb-8" aria-labelledby="hot-title">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-primary md:text-2xl" id="hot-title">
                🔥 Mais alugados esta semana
              </h2>
              <Link href="/itens" className="text-sm font-semibold text-brand hover:underline outline-none focus-visible:ring-1 focus-visible:ring-brand rounded">
                Ver todos →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-4">
              {hotItems.map((item) => (
                <ItemCard key={item.id} item={item} hotBadge />
              ))}
            </div>
          </section>
        )}

        {/* ─── ITENS PRÓXIMOS ─── */}
        {items.length > 0 && (
          <section className="pb-8" aria-labelledby="nearby-title">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-primary md:text-2xl" id="nearby-title">
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
                <h3 className="mb-2 font-display text-base font-bold text-primary">{step.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── DEPOIMENTOS ─── */}
        <section className="py-8" aria-labelledby="testimonials-title">
          <h2 className="mb-6 text-xl font-bold text-primary md:text-2xl" id="testimonials-title">
            O que dizem nossos usuários
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              {
                name: "Ana Beatriz S.",
                role: "Locatária",
                text: "Aluguei uma furadeira para uma reforma e ficou ótimo. Paguei menos de R$ 20 por 3 dias e o proprietário foi super atencioso.",
                rating: 5,
                initial: "A",
              },
              {
                name: "Carlos M.",
                role: "Proprietário",
                text: "Tenho equipamentos de camping parados há anos. Já gerei mais de R$ 400 em renda extra esse mês. Vale muito a pena anunciar!",
                rating: 5,
                initial: "C",
              },
              {
                name: "Fernanda L.",
                role: "Locatária",
                text: "Precisava de uma câmera para um evento e encontrei exatamente o que queria a 2 km de casa. Processo fácil e seguro.",
                rating: 5,
                initial: "F",
              },
            ].map((t) => (
              <div
                key={t.name}
                className="rounded-xl bg-[#144D81] p-6 flex flex-col gap-4"
              >
                {/* Estrelas */}
                <div className="flex gap-0.5" aria-label={`${t.rating} estrelas`}>
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="#59C686" aria-hidden="true">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  ))}
                </div>
                {/* Texto */}
                <p className="flex-1 text-sm leading-relaxed text-white/85">&ldquo;{t.text}&rdquo;</p>
                {/* Autor */}
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-[#003366]"
                    aria-hidden="true"
                  >
                    {t.initial}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{t.name}</p>
                    <p className="text-xs text-white/55">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ─── CTA ─── */}
        <section className="pb-12">
          <div className="rounded-xl bg-gradient-to-br from-primary to-[#144D81] px-8 py-10">
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/15 px-3 py-1 text-xs font-semibold text-accent">
              🌿 Economia circular
            </div>
            <h2 className="mb-3 font-display text-2xl font-extrabold leading-snug text-white">
              Tem itens parados?<br />Transforme em renda.
            </h2>
            <p className="mb-6 max-w-lg text-sm text-white/75 leading-relaxed">
              Cadastre seus itens gratuitamente e comece a alugar para pessoas próximas. Sem mensalidade, sem complicação.
            </p>
            <Link
              href="/itens/novo"
              className="inline-flex h-12 items-center rounded-lg bg-accent px-6 text-base font-bold text-[#003366] hover:brightness-105 transition-all outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
            >
              Começar a anunciar →
            </Link>
          </div>
        </section>

      </div>
      </main>
    </div>
  )
}
