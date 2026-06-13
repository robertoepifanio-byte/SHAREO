import type { Metadata } from "next"
import Image from "next/image"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AppHeader } from "@/components/layout/AppHeader"
import { UpgradePjForm } from "./_UpgradePjForm"
import Link from "next/link"

export const metadata: Metadata = { title: "Meu Perfil" }

const REVIEW_TYPE_LABEL: Record<string, string> = {
  ITEM:     "sobre o item",
  OWNER:    "sobre você como proprietário",
  BORROWER: "sobre você como locatário",
}

const CONFIG_LINKS = [
  { href: "/perfil/editar",     icon: "✏️", label: "Editar perfil",      desc: "Nome, bio, telefone, avatar" },
  { href: "/perfil/endereco",   icon: "📍", label: "Endereço",            desc: "Cidade, estado, bairro" },
  { href: "/perfil/seguranca",  icon: "🔒", label: "Login e segurança",   desc: "E-mail, senha, excluir conta" },
  { href: "/perfil/documentos", icon: "🪪", label: "Documentos",          desc: "CPF/CNPJ e verificação de identidade" },
  { href: "/perfil/recebimentos", icon: "💸", label: "Conta de recebimento", desc: "Chave PIX para repasse das locações" },
  { href: "/perfil/repasses",         icon: "📊", label: "Meus repasses",          desc: "Histórico e status dos repasses recebidos" },
  { href: "/perfil/repasses/informe", icon: "📄", label: "Informe de Rendimentos", desc: "Total anual recebido para declaração de IR" },
  { href: "/perfil/indicacoes",       icon: "🎁", label: "Indicações",              desc: "Programa de indicação e créditos" },
  { href: "/perfil/dados",       icon: "📂", label: "Privacidade e dados",  desc: "Exportar dados, política de retenção" },
]

export default async function ProfilePage() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/perfil")

  const isAdmin = session.user.role != null && session.user.role !== "USER"
  const userId = session.user.id

  const [user, reviewStats] = await Promise.all([
    prisma.user.findUnique({
      where:  { id: userId },
      select: {
        id:        true,
        name:      true,
        email:     true,
        bio:       true,
        phone:     true,
        city:      true,
        state:     true,
        neighborhood: true,
        avatarUrl: true,
        slug:      true,
        userType:  true,
        isVerified: true,
        createdAt:  true,
        _count: {
          select: {
            items:              { where: { status: { in: ["AVAILABLE", "PAUSED", "DRAFT"] }, deletedAt: null } },
            bookingsAsBorrower: { where: { status: { in: ["RETURNED", "COMPLETED"] } } },
            bookingsAsOwner:    { where: { status: { in: ["RETURNED", "COMPLETED"] } } },
          },
        },
        reviewsReceived: {
          select: {
            rating:     true,
            comment:    true,
            reviewType: true,
            reviewer:   { select: { name: true, avatarUrl: true } },
            createdAt:  true,
          },
          orderBy: { createdAt: "desc" },
          take:    5,
        },
      },
    }),
    prisma.review.aggregate({
      where:  { revieweeId: userId },
      _avg:   { rating: true },
      _count: { _all: true },
    }),
  ])

  if (!user) redirect("/login")

  const avgRating     = reviewStats._avg.rating
  const reviewCount   = reviewStats._count._all
  const totalBookings = user._count.bookingsAsBorrower + user._count.bookingsAsOwner

  const fmtMemberSince = new Intl.DateTimeFormat("pt-BR", {
    month: "long", year: "numeric",
  }).format(user.createdAt)

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container py-8">
        <div className="mx-auto max-w-2xl space-y-5">

          {/* ── Hero card ── */}
          <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">

            {/* Faixa de cor no topo */}
            <div className="h-24 bg-gradient-to-r from-primary to-[#144D81]" />

            {/* Avatar + info */}
            <div className="px-6 pb-6">
              <div className="flex items-end justify-between gap-4 -mt-12 mb-4">
                {/* Avatar grande */}
                <div className="flex-shrink-0 ring-4 ring-surface rounded-full">
                  {user.avatarUrl ? (
                    <Image
                      src={user.avatarUrl}
                      alt={user.name}
                      width={96}
                      height={96}
                      className="h-24 w-24 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-3xl font-bold text-white">
                      {user.name[0]?.toUpperCase() ?? "U"}
                    </div>
                  )}
                </div>

                {/* Botão editar */}
                <Link
                  href="/perfil/editar"
                  className="mb-1 inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-4 text-sm font-semibold text-foreground hover:bg-background transition-colors"
                >
                  ✏️ Editar
                </Link>
              </div>

              {/* Nome + badges */}
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-primary">{user.name}</h1>
                {user.isVerified && (
                  <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success">
                    ✓ Verificado
                  </span>
                )}
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                  {user.userType === "PF" ? "Pessoa Física" : "Pessoa Jurídica"}
                </span>
              </div>

              {/* Bio em destaque */}
              {user.bio && (
                <p className="mt-1 mb-3 text-sm text-foreground leading-relaxed">{user.bio}</p>
              )}

              {/* Meta-info */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {(user.city || user.state) && (
                  <span>📍 {[user.neighborhood, user.city, user.state].filter(Boolean).join(", ")}</span>
                )}
                {user.phone && <span>📞 {user.phone}</span>}
                <span>🗓 Membro desde {fmtMemberSince}</span>
              </div>

              {/* Vitrine PJ ou CTA upgrade (oculto para admins) */}
              {!isAdmin && (
                user.userType === "PJ" ? (
                  <div className="mt-4 flex items-center gap-3">
                    <Link
                      href={`/loja/${user.slug ?? user.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-semibold text-foreground hover:bg-background transition-colors"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                        <polyline points="15 3 21 3 21 9"/>
                        <line x1="10" y1="14" x2="21" y2="3"/>
                      </svg>
                      Ver minha vitrine
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      shareo.com.br/loja/{user.slug ?? user.id}
                    </span>
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl border border-brand/20 bg-brand/5 p-4">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand">PJ</span>
                      <p className="text-sm font-semibold text-foreground">Desbloqueie recursos para negócios</p>
                    </div>
                    <p className="mb-3 text-xs text-muted-foreground">
                      Vitrine personalizada, analytics avançado e importação em massa de itens.
                    </p>
                    <UpgradePjForm />
                  </div>
                )
              )}
            </div>
          </div>

          {/* ── Estatísticas ── */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: user._count.items,  label: user._count.items === 1 ? "item anunciado" : "itens anunciados", icon: "📦" },
              { value: totalBookings,       label: totalBookings === 1 ? "aluguel" : "aluguéis",                   icon: "🔄" },
              {
                value: avgRating !== null ? avgRating.toFixed(1) : "—",
                label: avgRating !== null ? `★ nota (${reviewCount})` : "sem avaliações",
                icon:  "⭐",
              },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-border bg-surface p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1" aria-hidden="true">{stat.icon}</p>
                <p className="text-2xl font-bold text-primary">{stat.value}</p>
                <p className="mt-0.5 text-xs text-muted-foreground leading-snug">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* ── Avaliações recebidas ── */}
          {user.reviewsReceived.length > 0 && (
            <div className="rounded-xl border border-border bg-surface p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold text-foreground">
                  Avaliações recebidas
                  {reviewCount > 5 && (
                    <span className="ml-2 text-sm font-normal text-muted-foreground">(últimas 5 de {reviewCount})</span>
                  )}
                </h2>
                {avgRating !== null && (
                  <span className="text-sm font-bold text-yellow-500">
                    ★ {avgRating.toFixed(1)}
                  </span>
                )}
              </div>

              <div className="space-y-4">
                {user.reviewsReceived.map((review, i) => (
                  <div key={i} className="flex gap-3 border-b border-border pb-4 last:border-0 last:pb-0">
                    {/* Avatar do reviewer */}
                    <div className="flex-shrink-0">
                      {review.reviewer.avatarUrl ? (
                        <Image src={review.reviewer.avatarUrl} alt={review.reviewer.name} width={32} height={32} className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                          {review.reviewer.name[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-foreground">{review.reviewer.name}</span>
                          <span className="text-yellow-400 text-xs leading-none">
                            {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
                          </span>
                        </div>
                        <span className="whitespace-nowrap text-xs text-muted-foreground flex-shrink-0">
                          {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(review.createdAt))}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">
                        {REVIEW_TYPE_LABEL[review.reviewType] ?? review.reviewType}
                      </p>
                      {review.comment && (
                        <p className="text-sm text-foreground leading-relaxed">{review.comment}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Configurações ── */}
          <div className="rounded-xl border border-border bg-surface overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground">Configurações da conta</h2>
            </div>
            <div>
              {CONFIG_LINKS.map((item, idx) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-5 py-4 hover:bg-background transition-colors group ${
                    idx < CONFIG_LINKS.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-base" aria-hidden="true">
                      {item.icon}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-foreground group-hover:text-brand transition-colors">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground flex-shrink-0 group-hover:text-brand transition-colors" aria-hidden="true">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </Link>
              ))}
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}
